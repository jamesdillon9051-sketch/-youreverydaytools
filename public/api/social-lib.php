<?php
 declare(strict_types=1);
 if (!defined('LOCALTOOLS_SOCIAL')) { http_response_code(404); exit; }

 final class SocialError extends RuntimeException {
     public int $status;
     public function __construct(string $message, int $status = 400) { parent::__construct($message); $this->status = $status; }
 }
 function social_config(): array {
     $root = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__, 2)), '/');
     $privateRoot = str_contains($root, '/domains/') ? explode('/domains/', $root, 2)[0] : dirname($root);
     $path = getenv('LOCALTOOLS_SOCIAL_CONFIG') ?: $privateRoot . '/localtools-social-config.php';
     $config = is_file($path) ? require $path : [];
     if (!is_array($config)) throw new SocialError('The download service configuration is invalid.', 503);
     return array_merge([
         'scrapecreators_key' => getenv('SCRAPECREATORS_API_KEY') ?: '',
         'rocketapi_key' => getenv('ROCKETAPI_KEY') ?: '',
         'signing_key' => getenv('SOCIAL_SIGNING_KEY') ?: '',
         'storage_dir' => $privateRoot . '/localtools-social-cache',
         'hourly_requests' => 10, 'daily_requests' => 500, 'max_download_bytes' => 128 * 1024 * 1024,
     ], $config);
 }
 function social_json(array $body, int $status = 200): never {
     http_response_code($status);
     header('Content-Type: application/json; charset=utf-8');
     header('Cache-Control: no-store');
     header('X-Content-Type-Options: nosniff');
     echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
     exit;
 }
 function social_key(array $config): string {
     $key = (string)($config['signing_key'] ?: ($config['scrapecreators_key'] ?: $config['rocketapi_key']));
     if (strlen($key) < 16) throw new SocialError('The download service is awaiting private API configuration.', 503);
     return hash('sha256', 'localtools-social-v1:' . $key, true);
 }
 function social_token(array $payload, array $config): string {
     $encoded = rtrim(strtr(base64_encode(json_encode($payload, JSON_UNESCAPED_SLASHES)), '+/', '-_'), '=');
     return $encoded . '.' . hash_hmac('sha256', $encoded, social_key($config));
 }
 function social_verify(string $token, array $config): array {
     if (strlen($token) > 24000) throw new SocialError('Invalid download link.');
     $parts = explode('.', $token);
     if (count($parts) !== 2 || !hash_equals(hash_hmac('sha256', $parts[0], social_key($config)), $parts[1])) throw new SocialError('Invalid download link.', 403);
     $payload = json_decode((string)base64_decode(strtr($parts[0], '-_', '+/'), true), true);
     if (!is_array($payload) || ($payload['expires'] ?? 0) < time() || ($payload['expires'] ?? 0) > time() + 901) throw new SocialError('This download link has expired. Fetch the media again.', 410);
     social_media_url((string)($payload['url'] ?? ''));
     if (!in_array($payload['kind'] ?? '', ['photo', 'video'], true)) throw new SocialError('Invalid media type.');
     return $payload;
 }
 function social_rate(array $config, string $action): void {
     $directory = (string)$config['storage_dir'];
     if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) throw new SocialError('The download service cannot initialize private storage.', 503);
     $hour = gmdate('YmdH'); $day = gmdate('Ymd');
     $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
     $client = hash_hmac('sha256', $ip, social_key($config));
     $file = fopen($directory . '/rate-' . $day . '.json', 'c+');
     if ($file === false || !flock($file, LOCK_EX)) throw new SocialError('The download service is busy.', 503);
     try {
         $state = json_decode(stream_get_contents($file) ?: '{}', true) ?: [];
         $bucket = $action . ':' . $hour . ':' . $client;
         $limit = $action === 'extract' ? (int)$config['hourly_requests'] : 80;
         if (($state[$bucket] ?? 0) >= $limit || ($action === 'extract' && ($state['total'] ?? 0) >= (int)$config['daily_requests'])) throw new SocialError('The download service has reached its usage limit. Please try again later.', 429);
         $state[$bucket] = ($state[$bucket] ?? 0) + 1;
         if ($action === 'extract') $state['total'] = ($state['total'] ?? 0) + 1;
         rewind($file); ftruncate($file, 0); fwrite($file, json_encode($state)); fflush($file);
     } finally { flock($file, LOCK_UN); fclose($file); }
     foreach (glob($directory . '/rate-*.json') ?: [] as $old) if (filemtime($old) < time() - 172800) @unlink($old);
 }
 function social_input(string $platform, string $mode, string $input): array {
     $hosts = ['tiktok' => ['tiktok.com'], 'instagram' => ['instagram.com'], 'twitter' => ['x.com','twitter.com'], 'facebook' => ['facebook.com','fb.watch'], 'pinterest' => ['pinterest.com','pin.it'], 'reddit' => ['reddit.com','redd.it']];
     if (!isset($hosts[$platform]) || !in_array($mode, ['post','profile','stories','highlights'], true)) throw new SocialError('Unsupported downloader.');
     if (($mode === 'stories' || $mode === 'highlights') && $platform !== 'instagram') throw new SocialError('Stories and highlights are supported for Instagram only.');
     if ($mode === 'profile' && !in_array($platform, ['instagram','tiktok','twitter'], true)) throw new SocialError('Choose Instagram, TikTok, or X for profile pictures.');
     $input = trim($input);
     if (strlen($input) > 2048 || $input === '') throw new SocialError('Enter a public link or username.');
     if ($mode !== 'post' && preg_match('/^@?([a-zA-Z0-9_.]{1,64})$/D', $input, $m)) return ['handle' => $m[1], 'url' => '', 'highlight' => ''];
     $parts = parse_url($input);
     if (!$parts || ($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) throw new SocialError('Use a complete public HTTPS link.');
     $host = strtolower($parts['host'] ?? ''); $allowed = false;
     foreach ($hosts[$platform] as $domain) if ($host === $domain || str_ends_with($host, '.' . $domain)) $allowed = true;
     if (!$allowed) throw new SocialError('The link does not match the selected platform.');
     $path = $parts['path'] ?? '/'; $handle = ''; $highlight = '';
     if ($mode === 'highlights' && preg_match('~^/stories/highlights/(\d+)/?~', $path, $m)) $highlight = $m[1];
     elseif ($mode !== 'post') {
         if ($platform === 'instagram' && $mode === 'stories' && preg_match('~^/stories/([a-zA-Z0-9_.]+)/~', $path, $m)) $handle = $m[1];
         else $handle = ltrim(explode('/', trim($path, '/'))[0] ?? '', '@');
         if (!preg_match('/^[a-zA-Z0-9_.]{1,64}$/D', $handle) || in_array(strtolower($handle), ['p','reel','reels','stories','explore','i','home'], true)) throw new SocialError('Enter a public username or profile link.');
     }
     return ['handle' => $handle, 'url' => preg_replace('/#.*$/', '', $input), 'highlight' => $highlight];
 }
 function social_media_url(string $url): string {
     $parts = parse_url(html_entity_decode($url, ENT_QUOTES | ENT_HTML5));
     if (!$parts || strlen($url) > 8192 || ($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) || isset($parts['port']) || preg_match('/[\x00-\x20\x7f]/', $url)) throw new SocialError('The provider returned an unsupported media address.', 502);
     $host = strtolower($parts['host'] ?? '');
     $domains = ['cdninstagram.com','fbcdn.net','tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','tiktokv.com','tiktokv.us','tiktok.com','ibytedtos.com','byteoversea.com','muscdn.com','musical.ly','twimg.com','pinimg.com','redd.it','redditmedia.com'];
     foreach ($domains as $domain) if ($host === $domain || str_ends_with($host, '.' . $domain)) return html_entity_decode($url, ENT_QUOTES | ENT_HTML5);
     throw new SocialError('The provider returned an unsupported media host.', 502);
 }
 function social_public_ip(string $ip): bool {
     if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
     if (str_contains($ip, ':')) return false;
     foreach (['100.64.0.0/10','192.0.0.0/24','198.18.0.0/15'] as $cidr) {
         [$base,$bits] = explode('/', $cidr); $mask = -1 << (32 - (int)$bits);
         if ((ip2long($ip) & $mask) === (ip2long($base) & $mask)) return false;
     }
     return true;
 }
 function social_curl(string $url, array $options = []): CurlHandle {
     if (!extension_loaded('curl')) throw new SocialError('PHP cURL must be enabled by the site operator.', 503);
     $host = (string)parse_url($url, PHP_URL_HOST);
     $ips = gethostbynamel($host) ?: [];
     if (!$ips) throw new SocialError('The media service could not be reached.', 502);
     foreach ($ips as $ip) if (!social_public_ip($ip)) throw new SocialError('The service address is unavailable.', 502);
     $curl = curl_init($url);
     curl_setopt_array($curl, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 35, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_RESOLVE => [$host . ':443:' . $ips[0]], CURLOPT_USERAGENT => 'LocalTools/1.0', CURLOPT_RETURNTRANSFER => true]);
     curl_setopt_array($curl, $options);
     return $curl;
 }
 function social_provider(string $provider, string $path, array $params, array $config): array {
     $key = (string)$config[$provider === 'rocket' ? 'rocketapi_key' : 'scrapecreators_key'];
     if ($key === '') throw new SocialError('This downloader is awaiting API activation by the site operator. Other tools remain available.', 503);
     $rocket = $provider === 'rocket';
     $url = ($rocket ? 'https://v1.rocketapi.io' : 'https://api.scrapecreators.com') . $path;
     if (!$rocket) $url .= '?' . http_build_query($params);
     $options = [CURLOPT_HTTPHEADER => [$rocket ? 'Authorization: Token ' . $key : 'x-api-key: ' . $key, 'Content-Type: application/json'], CURLOPT_MAXFILESIZE => 8 * 1024 * 1024];
     if ($rocket) { $options[CURLOPT_POST] = true; $options[CURLOPT_POSTFIELDS] = json_encode($params); }
     $curl = social_curl($url, $options); $buffer = '';
     curl_setopt($curl, CURLOPT_WRITEFUNCTION, static function($c, string $chunk) use (&$buffer): int { if (strlen($buffer) + strlen($chunk) > 8 * 1024 * 1024) return 0; $buffer .= $chunk; return strlen($chunk); });
     $ok = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
     if ($ok === false) throw new SocialError('The provider request timed out or could not complete. Try again later.', 502);
     if ($status === 401 || $status === 402 || $status === 403 || $status === 429) throw new SocialError('The provider is unavailable or its account has reached a limit. Try again later.', 503);
     if ($status < 200 || $status >= 300) throw new SocialError('This public media is unavailable from the provider.', 502);
     $data = json_decode($buffer, true);
     if (!is_array($data) || ($data['success'] ?? true) === false) throw new SocialError('The provider could not retrieve this public media.', 422);
     if ($rocket) {
         $response = $data['response'] ?? [];
         if (($data['status'] ?? '') !== 'done' || ($response['status_code'] ?? 0) !== 200) throw new SocialError('Instagram did not return this public account or its active stories.', 422);
         $data = $response['body'] ?? [];
         if (is_string($data)) $data = json_decode($data, true) ?: [];
         if (($data['status'] ?? 'ok') !== 'ok') throw new SocialError('Instagram media is unavailable.', 422);
     }
     return $data;
 }
 function social_best(array $variants, string $field = 'url'): ?array {
     $usable = array_values(array_filter($variants, static fn($v) => is_array($v) && isset($v[$field])));
     usort($usable, static fn($a,$b) => ((int)($b['bitrate'] ?? (($b['width'] ?? $b['config_width'] ?? 0) * ($b['height'] ?? $b['config_height'] ?? 0)))) <=> ((int)($a['bitrate'] ?? (($a['width'] ?? $a['config_width'] ?? 0) * ($a['height'] ?? $a['config_height'] ?? 0)))));
     return $usable[0] ?? null;
 }
 function social_asset(array &$assets, ?string $url, string $kind, string $prefix, ?string $preview = null, array $dimensions = [], ?string $note = null): void {
     if (!$url || count($assets) >= 100) return;
     $url = social_media_url($url);
     foreach ($assets as $asset) if ($asset['url'] === $url) return;
     $extension = strtolower(pathinfo((string)parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
     if ($kind === 'video') $extension = 'mp4';
     elseif (!in_array($extension, ['jpg','jpeg','png','webp','gif','avif'], true)) $extension = 'jpg';
     $asset = ['url' => $url, 'kind' => $kind, 'filename' => $prefix . '-' . (count($assets) + 1) . '.' . $extension];
     if ($preview) { try { $asset['preview'] = social_media_url($preview); } catch (SocialError $e) {} }
     if ($kind === 'photo') $asset['preview'] = $url;
     foreach (['width','height'] as $dimension) if (!empty($dimensions[$dimension])) $asset[$dimension] = (int)$dimensions[$dimension];
     if ($note) $asset['note'] = $note;
     $assets[] = $asset;
 }
 function social_instagram(array $media, array &$assets): void {
     if (!empty($media['carousel_media'])) { foreach ($media['carousel_media'] as $item) social_instagram($item, $assets); return; }
     if (!empty($media['edge_sidecar_to_children']['edges'])) { foreach ($media['edge_sidecar_to_children']['edges'] as $edge) social_instagram($edge['node'], $assets); return; }
     $image = social_best($media['image_versions2']['candidates'] ?? []) ?? social_best($media['display_resources'] ?? [], 'src');
     $photo = $image['url'] ?? $image['src'] ?? $media['display_url'] ?? null;
     $video = social_best($media['video_versions'] ?? []);
     $isVideo = ($media['media_type'] ?? 0) === 2 || ($media['is_video'] ?? false) || isset($media['video_url']) || $video !== null;
     $dimensions = $media['dimensions'] ?? $image ?? [];
     if ($isVideo) social_asset($assets, $video['url'] ?? $media['video_url'] ?? null, 'video', 'instagram', $photo, $dimensions);
     else social_asset($assets, $photo, 'photo', 'instagram', null, $dimensions);
 }
 function social_normalize(string $platform, string $mode, array $data): array {
     $assets = [];
     if ($platform === 'instagram') {
         if ($mode === 'profile') { $user = $data['data']['user'] ?? $data['user'] ?? $data; if ($user['is_private'] ?? false) throw new SocialError('Only public profiles are supported.', 422); social_asset($assets, $user['profile_pic_url_hd'] ?? $user['hd_profile_pic_url_info']['url'] ?? $user['profile_pic_url'] ?? null, 'photo', 'instagram-profile'); }
         elseif ($mode === 'stories' || $mode === 'highlights') { foreach ($data['items'] ?? [] as $item) social_instagram($item, $assets); }
         else { $media = $data['data']['xdt_shortcode_media'] ?? $data['data']['shortcode_media'] ?? $data['items'][0] ?? []; social_instagram($media, $assets); }
     } elseif ($platform === 'tiktok') {
         if ($mode === 'profile') { $user = $data['user'] ?? []; if ($user['privateAccount'] ?? false) throw new SocialError('Only public profiles are supported.', 422); social_asset($assets, $user['avatarLarger'] ?? $user['avatarMedium'] ?? null, 'photo', 'tiktok-profile'); }
         else { $post = $data['aweme_detail'] ?? $data; $images = $post['image_post_info']['images'] ?? []; if ($images) foreach ($images as $image) social_asset($assets, $image['display_image']['url_list'][0] ?? $image['owner_watermark_image']['url_list'][0] ?? null, 'photo', 'tiktok'); else { $video = $post['video'] ?? []; social_asset($assets, $video['play_addr_h264']['url_list'][0] ?? $video['play_addr']['url_list'][0] ?? $video['download_addr']['url_list'][0] ?? null, 'video', 'tiktok', $video['cover']['url_list'][0] ?? null, $video); } }
     } elseif ($platform === 'twitter') {
         $tweet = $data['tweet'] ?? $data;
         if ($mode === 'profile') social_asset($assets, $tweet['legacy']['profile_image_url_https'] ?? $tweet['avatar']['image_url'] ?? $tweet['avatar']['url'] ?? null, 'photo', 'x-profile');
         else foreach ($tweet['legacy']['extended_entities']['media'] ?? $tweet['extended_entities']['media'] ?? [] as $item) { if (($item['type'] ?? 'photo') === 'photo') { $url = $item['media_url_https'] ?? null; if ($url) $url .= (str_contains($url, '?') ? '&' : '?') . 'name=orig'; social_asset($assets, $url, 'photo', 'x'); } else { $variants = array_filter($item['video_info']['variants'] ?? [], static fn($v) => ($v['content_type'] ?? '') === 'video/mp4'); $best = social_best($variants); social_asset($assets, $best['url'] ?? null, 'video', 'x', $item['media_url_https'] ?? null); } }
     } elseif ($platform === 'facebook') {
         $video = $data['video'] ?? []; if ($video) social_asset($assets, $video['hd_url'] ?? $video['sd_url'] ?? null, 'video', 'facebook', $video['thumbnail'] ?? null, $video);
         else { social_asset($assets, $data['image_url'] ?? null, 'photo', 'facebook'); foreach ($data['attachments'] ?? [] as $attachment) social_asset($assets, $attachment['image']['uri'] ?? $attachment['image_url'] ?? null, 'photo', 'facebook'); }
     } elseif ($platform === 'pinterest') {
         $pin = $data['pin'] ?? $data; $videos = $pin['videos']['video_list'] ?? []; $best = social_best(array_values($videos));
         if ($best) social_asset($assets, $best['url'], 'video', 'pinterest', $pin['imageSpec_orig']['url'] ?? null, $best);
         elseif (!empty($pin['videos'])) throw new SocialError('This pin has no supported MP4 download.', 422);
         else { $image = $pin['imageSpec_orig'] ?? $pin['images']['orig'] ?? $pin['imageSpec_736x'] ?? []; social_asset($assets, $image['url'] ?? null, 'photo', 'pinterest', null, $image); }
     } elseif ($platform === 'reddit') {
         $post = $data['post'] ?? $data;
         $video = $post['secure_media']['reddit_video'] ?? $post['media']['reddit_video'] ?? null;
         if ($video) social_asset($assets, $video['fallback_url'] ?? null, 'video', 'reddit', null, $video, 'Reddit may return a video-only file. Separate audio tracks are not merged on shared hosting.');
         elseif (!empty($post['gallery_data']['items'])) foreach ($post['gallery_data']['items'] as $item) { $image = $post['media_metadata'][$item['media_id']]['s'] ?? []; social_asset($assets, $image['u'] ?? $image['gif'] ?? null, 'photo', 'reddit'); }
         elseif (preg_match('~^https://i\.redd\.it/~', $post['url_overridden_by_dest'] ?? $post['url'] ?? '')) social_asset($assets, $post['url_overridden_by_dest'] ?? $post['url'], 'photo', 'reddit');
     }
     return $assets;
 }
 function social_extract(string $platform, string $mode, array $input, array $config, ?callable $request = null): array {
     $call = $request ?? static fn($provider,$path,$params) => social_provider($provider,$path,$params,$config);
     $collections = []; $assets = []; $title = ucfirst($platform) . ' ' . ($mode === 'post' ? 'media' : $mode);
     if ($platform === 'instagram' && $mode === 'stories') {
         $profile = $call('rocket','/instagram/user/get_info_by_username',['username' => $input['handle']]); $user = $profile['user'] ?? [];
         if ($user['is_private'] ?? false) throw new SocialError('Only public accounts are supported.', 422);
         $id = $user['pk'] ?? $user['id'] ?? null; if (!$id || !ctype_digit((string)$id)) throw new SocialError('The public account was not found.', 422);
         $data = $call('rocket','/instagram/user/get_stories',['ids' => [(int)$id]]);
         $reel = $data['reels'][(string)$id] ?? $data['reels_media'][0] ?? [];
         $assets = social_normalize('instagram','stories',$reel);
     } elseif ($platform === 'instagram' && $mode === 'highlights') {
         if ($input['highlight']) { $data = $call('scrape','/v1/instagram/user/highlight/detail',['id' => $input['highlight']]); $assets = social_normalize('instagram','highlights',$data); }
         else { $data = $call('scrape','/v1/instagram/user/highlights',['handle' => $input['handle']]); foreach ($data['highlights'] ?? [] as $collection) if (preg_match('/^\d+$/D', (string)($collection['id'] ?? ''))) $collections[] = ['id' => (string)$collection['id'], 'title' => substr((string)($collection['title'] ?? 'Highlight'),0,150)]; }
     } else {
         $paths = ['tiktok' => '/v2/tiktok/video', 'instagram' => '/v1/instagram/post', 'twitter' => '/v1/twitter/tweet', 'facebook' => '/v1/facebook/post', 'pinterest' => '/v1/pinterest/pin', 'reddit' => '/v1/reddit/post/comments'];
         $path = $mode === 'profile' ? '/v1/' . ($platform === 'twitter' ? 'twitter' : $platform) . '/profile' : $paths[$platform];
         $params = $mode === 'profile' ? ['handle' => $input['handle']] : ['url' => $input['url']];
         $data = $call('scrape',$path,$params); $assets = social_normalize($platform,$mode,$data);
     }
     if (!$assets && !$collections) throw new SocialError('No downloadable public media was returned. The link may be private, expired, restricted, or contain no supported files.', 422);
     $expires = time() + 900; $items = [];
     foreach ($assets as $index => $asset) {
         $payload = ['url' => $asset['url'], 'kind' => $asset['kind'], 'filename' => $asset['filename'], 'expires' => $expires];
         $item = array_diff_key($asset, ['url' => true,'preview' => true]);
         $item['id'] = (string)($index + 1); $item['downloadUrl'] = '/api/social-download.php?token=' . social_token($payload,$config);
         if (isset($asset['preview'])) $item['previewUrl'] = '/api/social-download.php?inline=1&token=' . social_token(['url' => $asset['preview'], 'kind' => 'photo', 'filename' => 'preview.jpg', 'expires' => $expires],$config);
         $items[] = $item;
     }
     return ['title' => $title, 'items' => $items, 'collections' => array_slice($collections,0,100), 'expiresAt' => $expires];
 }
