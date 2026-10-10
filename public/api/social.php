<?php
 declare(strict_types=1);
 define('LOCALTOOLS_SOCIAL', true);
 require __DIR__ . '/social-lib.php';
 try {
     $config = social_config();
     if ($_SERVER['REQUEST_METHOD'] === 'GET') {
         $ready = extension_loaded('curl') && ($config['scrapecreators_key'] !== '' || $config['rocketapi_key'] !== '');
         social_json(['ready' => $ready, 'providers' => ['scrapeCreators' => $config['scrapecreators_key'] !== '', 'rocketApi' => $config['rocketapi_key'] !== ''], 'message' => $ready ? 'Public media service is configured.' : 'Social downloads are awaiting activation by the site operator. Browser tools remain available.']);
     }
     if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: GET, POST'); throw new SocialError('Method not allowed.',405); }
     if (strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]) !== 'application/json') throw new SocialError('Send a JSON request.',415);
     $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
     if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]) throw new SocialError('Use the download form on this website.',403);
     if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin') === 'cross-site') throw new SocialError('Use the download form on this website.',403);
     $raw = file_get_contents('php://input', false, null, 0, 4097);
     if ($raw === false || strlen($raw) > 4096) throw new SocialError('The request is too large.',413);
     $body = json_decode($raw,true);
     if (!is_array($body) || !is_string($body['platform'] ?? null) || !is_string($body['mode'] ?? null) || !is_string($body['input'] ?? null)) throw new SocialError('Enter a public social link.');
     $input = social_input($body['platform'],$body['mode'],$body['input']);
     $providerKey = $body['mode'] === 'stories' ? $config['rocketapi_key'] : $config['scrapecreators_key'];
     if ($providerKey === '') throw new SocialError('This downloader is awaiting API activation by the site operator. Other tools remain available.',503);
     social_rate($config,'extract');
     social_json(social_extract($body['platform'],$body['mode'],$input,$config));
 } catch (SocialError $e) { social_json(['error' => $e->getMessage()],$e->status); }
 catch (Throwable $e) { social_json(['error' => 'The download service could not complete this request. Please try again later.'],500); }
