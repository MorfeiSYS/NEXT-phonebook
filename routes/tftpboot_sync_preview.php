<?php

function tftpboot_sync_preview(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$svc = tftpboot_instance($core);
	$map = $svc->sync_name_map();
	$diff = $svc->build_sync_diff($map);
	tftpboot_json_send(array('code' => 0, 'diff' => $diff, 'map_count' => count($map)));
}
