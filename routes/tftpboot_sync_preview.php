<?php

function tftpboot_sync_preview(&$core, $params, $post_data)
{
	@set_time_limit(180);
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$svc = tftpboot_instance($core);
	list($vendors, $explicit) = tftpboot_bulk_vendors_from_post($post_data, $svc);
	if(!count($vendors))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootBulkNoVendors')));
		return;
	}

	$map = $svc->sync_name_map();
	$diff = $svc->build_sync_diff($map, $vendors);
	tftpboot_json_send(array('code' => 0, 'diff' => $diff, 'map_count' => count($map)));
}
