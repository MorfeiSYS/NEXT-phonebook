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

	foreach($items as $item)
	{
		if(!is_array($item))
		{
			continue;
		}
		$title = isset($item['title']) ? $item['title'] : '';
		$number = isset($item['number']) ? tftpboot_sanitize_speed_dial_number($item['number']) : '';
		$err = tftpboot_validate_dial_entry($title, $number);
		if($err !== '')
		{
			tftpboot_json_send(array('code' => 1, 'message' => $err));
			exit;
		}
	}

	$svc = tftpboot_instance($core);
	list($vendors, $explicit) = tftpboot_bulk_vendors_from_post($post_data, $svc);
	if($explicit && !count($vendors))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootBulkNoVendors')));
		return;
	}

	$n = $svc->bulk_save_keys($items, $vendors);
	log_db('tftpboot bulk save', 'keys='.$n.';vendors='.implode(',', $vendors), 0);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save'), 'updated' => $n, 'keys' => $n));
}
