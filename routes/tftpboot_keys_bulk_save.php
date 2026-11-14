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

	$vendors = isset($post_data['vendors']) ? $post_data['vendors'] : array();
	$svc = tftpboot_instance($core);
	$allowed = $svc->get_enabled_vendors('bulk');
	$vendors = array_values(array_intersect($vendors, $allowed));
	if(!count($vendors))
	{
		$vendors = $allowed;
	}

	$n = $svc->bulk_save_keys($items, $vendors);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save'), 'updated' => $n));
}
