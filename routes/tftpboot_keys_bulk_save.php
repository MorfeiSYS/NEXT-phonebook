<?php

function tftpboot_keys_bulk_save(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$items = isset($post_data['items']) ? $post_data['items'] : array();
	if(!is_array($items))
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid data'));
		exit;
	}

	$svc = tftpboot_instance($core);
	list($vendors, $explicit) = tftpboot_bulk_vendors_from_post($post_data, $svc);
	if($explicit && !count($vendors))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootBulkNoVendors')));
		return;
	}

	$n = $svc->bulk_save_keys($items, $vendors);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save'), 'updated' => $n, 'keys' => $n));
}
