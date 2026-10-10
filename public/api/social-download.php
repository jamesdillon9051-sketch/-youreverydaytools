<?php
 declare(strict_types=1);
 define('LOCALTOOLS_SOCIAL', true);
 require __DIR__ . '/social-lib.php';
 $temporary = null;
 try {
     if ($_SERVER['REQUEST_METHOD'] !== 'GET') { header('Allow: GET'); throw new SocialError('Method not allowed.',405); }
     $config = social_config();
     $token = $_GET['token'] ?? ''; if (!is_string($token)) throw new SocialError('Invalid download link.');
     $payload = social_verify($token,$config); social_rate($config,'download');
     $inline = ($_GET['inline'] ?? '') === '1';
     if ($inline && $payload['kind'] !== 'photo') throw new SocialError('Inline previews are available for images only.');
     $url = $payload['url']; $temporary = tmpfile();
     if ($temporary === false) throw new SocialError('The server cannot prepare this download.',503);
     $limit = (int)$config['max_download_bytes']; $mime = ''; $status = 0; $bytes = 0; $rejected = false;
     for ($hop = 0; $hop < 4; $hop++) {
         social_media_url($url); rewind($temporary); ftruncate($temporary,0); $bytes = 0; $location = ''; $mime = ''; $status = 0; $rejected = false;
         $curl = social_curl($url,[CURLOPT_TIMEOUT => 90, CURLOPT_MAXFILESIZE => $limit]);
         curl_setopt($curl,CURLOPT_HEADERFUNCTION,static function($c,string $line) use (&$location,&$mime,&$status): int {
             if (preg_match('~^HTTP/\S+\s+(\d+)~',$line,$m)) $status = (int)$m[1];
             if (stripos($line,'Location:') === 0) $location = trim(substr($line,9));
             if (stripos($line,'Content-Type:') === 0) $mime = strtolower(trim(explode(';',substr($line,13))[0]));
             return strlen($line);
         });
         curl_setopt($curl,CURLOPT_WRITEFUNCTION,static function($c,string $chunk) use ($temporary,$payload,$limit,&$bytes,&$mime,&$status,&$rejected): int {
             if ($status >= 300 && $status < 400) return strlen($chunk);
             $types = $payload['kind'] === 'video' ? ['video/mp4'] : ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
             if (!in_array($mime,$types,true) || $bytes + strlen($chunk) > $limit) { $rejected = true; return 0; }
             $bytes += strlen($chunk); return fwrite($temporary,$chunk);
         });
         $ok = curl_exec($curl); $status = (int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE); curl_close($curl);
         if ($status >= 300 && $status < 400 && $location !== '') {
             if (str_starts_with($location,'/')) $location = 'https://' . parse_url($url,PHP_URL_HOST) . $location;
             $url = social_media_url($location); continue;
         }
         if ($rejected) throw new SocialError('This media type is unsupported or exceeds the 128 MB download limit.',422);
         if ($ok === false || $status !== 200 || $bytes === 0) throw new SocialError('The media link is no longer available. Fetch the post again.',502);
         break;
     }
     if ($status !== 200 || $bytes === 0) throw new SocialError('The media could not be retrieved.',502);
     $filename = preg_replace('/[^a-zA-Z0-9_.-]/','-',(string)$payload['filename']);
     $extensions = ['image/jpeg' => 'jpg','image/png' => 'png','image/webp' => 'webp','image/gif' => 'gif','image/avif' => 'avif','video/mp4' => 'mp4'];
     $filename = pathinfo($filename,PATHINFO_FILENAME) . '.' . $extensions[$mime];
     header('Content-Type: ' . $mime); header('Content-Length: ' . $bytes); header('Cache-Control: private, no-store'); header('X-Content-Type-Options: nosniff');
     header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . $filename . '"');
     rewind($temporary); fpassthru($temporary);
 } catch (SocialError $e) { social_json(['error' => $e->getMessage()],$e->status); }
 catch (Throwable $e) { social_json(['error' => 'The media download could not complete. Please fetch the post again.'],500); }
 finally { if (is_resource($temporary)) fclose($temporary); }
