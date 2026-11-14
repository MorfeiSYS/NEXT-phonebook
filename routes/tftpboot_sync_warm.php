<?php

function tftpboot_sync_warm(&$core, $params, $post_data)
{
	@set_time_limit(600);
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$svc = tftpboot_instance($core);
	list($vendors, $explicit) = tftpboot_bulk_vendors_from_post($post_data, $svc);
	if(!count($vendors))
	{
		$vendors = $svc->get_enabled_vendors('bulk');
	}
	if(!count($vendors))
	{
		tftpboot_json_send(array('code' => 0, 'skipped' => 1));
		return;
	}

	$svc->list_unique_dial_keys($vendors, '');
	tftpboot_json_send(array('code' => 0));
}