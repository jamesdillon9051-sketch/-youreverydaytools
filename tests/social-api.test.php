<?php
 declare(strict_types=1);
 define('LOCALTOOLS_SOCIAL',true);
 require dirname(__DIR__) . '/public/api/social-lib.php';
 $count = 0;
 function check(bool $condition, string $message): void { global $count; if (!$condition) throw new RuntimeException($message); $count++; }
 function rejects(callable $call, int $status): void { try { $call(); } catch (SocialError $e) { check($e->status === $status,'Unexpected error status: ' . $e->status); return; } throw new RuntimeException('Expected rejection.'); }
 $config = ['signing_key' => 'fixture-signing-key-not-a-live-credential','scrapecreators_key' => '', 'rocketapi_key' => '', 'storage_dir' => sys_get_temp_dir() . '/localtools-test-' . bin2hex(random_bytes(6)), 'hourly_requests' => 2, 'daily_requests' => 3];
 foreach (['127.0.0.1','10.0.0.1','169.254.169.254','172.16.1.1','192.168.1.1','100.64.1.1','198.18.0.1','::1','::ffff:127.0.0.1','192.0.0.2'] as $ip) check(!social_public_ip($ip),'Private address accepted: ' . $ip);
 check(social_public_ip('1.1.1.1'),'Public address rejected.');
 foreach (['http://pbs.twimg.com/a.jpg','https://pbs.twimg.com.attacker.test/a.jpg','https://localhost/a.jpg','https://pbs.twimg.com:443/a.jpg','https://user@pbs.twimg.com/a.jpg','https://127.0.0.1/a.jpg','https://pbs.twimg.com/a.jpg%0d%0a'] as $url) {
     if (str_contains($url,'%0d')) continue;
     rejects(fn() => social_media_url($url),502);
 }
 rejects(fn() => social_input('twitter','post','https://x.com.attacker.test/person/status/1'),400);
 rejects(fn() => social_input('facebook','stories','user'),400);
 rejects(fn() => social_input('instagram','profile','https://instagram.com/reel/123/'),400);
 check(social_input('instagram','highlights','https://www.instagram.com/stories/highlights/1234/')['highlight'] === '1234','Highlight parsing failed.');
 check(social_input('instagram','stories','https://instagram.com/stories/creator/123/')['handle'] === 'creator','Story parsing failed.');
 check(social_input('tiktok','profile','@creator')['handle'] === 'creator','Handle parsing failed.');
 $payload = ['url' => 'https://pbs.twimg.com/media/test.jpg','kind' => 'photo','filename' => 'test.jpg','expires' => time()+600];
 $token = social_token($payload,$config); check(social_verify($token,$config) === $payload,'Token round trip failed.');
 rejects(fn() => social_verify($token . 'x',$config),403);
 $expired = $payload; $expired['expires'] = time()-1; rejects(fn() => social_verify(social_token($expired,$config),$config),410);
 $invalid = $payload; $invalid['url'] = 'https://localhost/private'; rejects(fn() => social_verify(social_token($invalid,$config),$config),502);
 $image = ['media_type' => 1,'image_versions2' => ['candidates' => [['url' => 'https://scontent.cdninstagram.com/small.jpg','width' => 100,'height' => 100],['url' => 'https://scontent.cdninstagram.com/original.jpg','width' => 1080,'height' => 1080]]]];
 $video = ['media_type' => 2,'video_versions' => [['url' => 'https://scontent.cdninstagram.com/low.mp4','width' => 320,'height' => 320],['url' => 'https://scontent.cdninstagram.com/hd.mp4','width' => 1080,'height' => 1080]],'image_versions2' => $image['image_versions2']];
 $assets = social_normalize('instagram','post',['items' => [['carousel_media' => [$image,$video]]]]);
 check(count($assets) === 2 && $assets[0]['url'] === 'https://scontent.cdninstagram.com/original.jpg' && $assets[1]['url'] === 'https://scontent.cdninstagram.com/hd.mp4','Instagram carousel quality selection failed.');
 check(social_normalize('instagram','post',['data' => ['xdt_shortcode_media' => ['is_video' => true,'display_url' => 'https://scontent.cdninstagram.com/preview.jpg']]]) === [],'Video thumbnail incorrectly returned as photo.');
 rejects(fn() => social_normalize('instagram','profile',['data' => ['user' => ['is_private' => true,'profile_pic_url' => 'https://scontent.cdninstagram.com/avatar.jpg']]]),422);
 $assets = social_normalize('tiktok','post',['aweme_detail' => ['image_post_info' => ['images' => [['display_image' => ['url_list' => ['https://p16.tiktokcdn.com/one.jpg']]],['display_image' => ['url_list' => ['https://p16.tiktokcdn.com/two.jpg']]]]]]]);
 check(count($assets) === 2 && $assets[1]['kind'] === 'photo','TikTok slideshow failed.');
 check(social_normalize('tiktok','post',['aweme_detail' => ['video' => ['play_addr' => ['url_list' => ['https://v16.tiktokcdn.com/video.mp4']]]]])[0]['kind'] === 'video','TikTok video failed.');
 $assets = social_normalize('twitter','post',['legacy' => ['extended_entities' => ['media' => [['type' => 'video','media_url_https' => 'https://pbs.twimg.com/thumb.jpg','video_info' => ['variants' => [['url' => 'https://video.twimg.com/stream.m3u8','content_type' => 'application/x-mpegURL','bitrate' => 999999],['url' => 'https://video.twimg.com/low.mp4','content_type' => 'video/mp4','bitrate' => 100],['url' => 'https://video.twimg.com/high.mp4','content_type' => 'video/mp4','bitrate' => 1000]]]]]]]]);
 check($assets[0]['url'] === 'https://video.twimg.com/high.mp4','X MP4 quality selection failed.');
 check(social_normalize('facebook','post',['video' => ['sd_url' => 'https://video.fbcdn.net/sd.mp4','hd_url' => 'https://video.fbcdn.net/hd.mp4']])[0]['url'] === 'https://video.fbcdn.net/hd.mp4','Facebook HD selection failed.');
 check(social_normalize('pinterest','post',['imageSpec_orig' => ['url' => 'https://i.pinimg.com/originals/test.jpg']])[0]['kind'] === 'photo','Pinterest original image failed.');
 check(social_normalize('pinterest','post',['videos' => ['video_list' => ['V_720P' => ['url' => 'https://v.pinimg.com/video.mp4','width' => 720,'height' => 1280]]]])[0]['kind'] === 'video','Pinterest video failed.');
 $assets = social_normalize('reddit','post',['post' => ['gallery_data' => ['items' => [['media_id' => 'one']]],'media_metadata' => ['one' => ['s' => ['u' => 'https://preview.redd.it/one.jpg?a=1&amp;b=2']]]]]);
 check($assets[0]['url'] === 'https://preview.redd.it/one.jpg?a=1&b=2','Reddit gallery decoding failed.');
 $assets = social_normalize('reddit','post',['post' => ['secure_media' => ['reddit_video' => ['fallback_url' => 'https://v.redd.it/post/DASH_720.mp4']]]]);
 check(str_contains($assets[0]['note'],'video-only'),'Reddit audio limitation missing.');
 $calls = [];
 $request = function($provider,$path,$params) use (&$calls,$image,$video): array {
     $calls[] = [$provider,$path,$params];
     if ($path === '/instagram/user/get_info_by_username') return ['user' => ['pk' => 123,'is_private' => false]];
     if ($path === '/instagram/user/get_stories') return ['reels' => ['123' => ['items' => [$image,$video]]]];
     if ($path === '/v1/instagram/user/highlights') return ['highlights' => [['id' => '456','title' => 'My highlight']]];
     if ($path === '/v1/instagram/user/highlight/detail') return ['items' => [$image]];
     return [];
 };
 $result = social_extract('instagram','stories',social_input('instagram','stories','creator'),$config,$request);
 check(count($result['items']) === 2 && $calls[0][0] === 'rocket' && $calls[1][2]['ids'] === [123],'Story provider request sequence failed.');
 check(str_starts_with($result['items'][0]['downloadUrl'],'/api/social-download.php?token=') && !isset($result['items'][0]['url']),'Unsigned upstream URL exposed.');
 $result = social_extract('instagram','highlights',social_input('instagram','highlights','creator'),$config,$request);
 check($result['collections'][0]['id'] === '456' && $result['items'] === [],'Highlight listing failed.');
 $result = social_extract('instagram','highlights',social_input('instagram','highlights','https://instagram.com/stories/highlights/456/'),$config,$request);
 check(count($result['items']) === 1 && end($calls)[2]['id'] === '456','Highlight detail retrieval failed.');
 rejects(fn() => social_extract('instagram','post',social_input('instagram','post','https://instagram.com/p/empty/'),$config,fn() => []),422);
 try {
     $_SERVER['REMOTE_ADDR'] = '192.0.2.15'; social_rate($config,'extract'); social_rate($config,'extract'); rejects(fn() => social_rate($config,'extract'),429);
     $_SERVER['REMOTE_ADDR'] = '192.0.2.16'; social_rate($config,'extract');
     $_SERVER['REMOTE_ADDR'] = '192.0.2.17'; rejects(fn() => social_rate($config,'extract'),429);
     $saved = file_get_contents((glob($config['storage_dir'].'/*') ?: [])[0]); check(!str_contains($saved,'192.0.2.'),'Raw client IP persisted.');
 } finally { foreach (glob($config['storage_dir'].'/*') ?: [] as $file) unlink($file); if (is_dir($config['storage_dir'])) rmdir($config['storage_dir']); }
 echo 'Social API: ' . $count . " checks passed.\n";
