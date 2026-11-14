<?php

function tftpboot_sync_run(&$core, $params, $post_data)
{
	$key = isset($post_data['key']) ? trim($post_data['key']) : (isset($_GET['key']) ? trim($_GET['key']) : '');
	$stored = $core->Config->get_global('tftpboot_sync_cron_key', '');
	if($stored === '' || $key !== $stored)
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid key'));
		exit;
	}

	if(intval($core->Config->get_global('tftpboot_sync_auto', '0')) !== 1)
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Auto sync disabled'));
		exit;
	}

	$svc = tftpboot_instance($core);
	$vendors = tftpboot_bulk_vendor_choices($svc);
	$map = $svc->sync_name_map();
	$diff = $svc->build_sync_diff($map, $vendors);
	$n = $svc->apply_sync_diff($diff, $vendors);
	tftpboot_json_send(array('code' => 0, 'applied' => $n));
}
