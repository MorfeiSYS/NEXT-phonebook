<?php

function tftpboot_keys_search(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$query = isset($post_data['q']) ? trim($post_data['q']) : '';
	$vendors = isset($post_data['vendors']) ? $post_data['vendors'] : array();
	if(!is_array($vendors))
	{
		$vendors = array();
	}

	$svc = tftpboot_instance($core);
	$allowed = $svc->get_enabled_vendors('bulk');
	$vendors = array_values(array_intersect($vendors, $allowed));
	if(!count($vendors))
	{
		$vendors = $allowed;
	}

	$rows = $svc->search_keys($query, $vendors);
	tftpboot_json_send(array('code' => 0, 'rows' => $rows));
}
