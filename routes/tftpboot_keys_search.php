<?php

function tftpboot_keys_search(&$core, $params, $post_data)
{
	@set_time_limit(180);
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$query = isset($post_data['q']) ? trim($post_data['q']) : '';
	$svc = tftpboot_instance($core);
	list($vendors, $explicit) = tftpboot_bulk_vendors_from_post($post_data, $svc);
	if($explicit && !count($vendors))
	{
		tftpboot_json_send(array('code' => 0, 'rows' => array()));
		return;
	}

	$rows = $svc->search_keys($query, $vendors);
	tftpboot_json_send(array('code' => 0, 'rows' => $rows));
}
