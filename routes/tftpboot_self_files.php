<?php

function tftpboot_self_files(&$core, $params, $post_data)
{
	assert_tftpboot_self_ajax($core);
	$files = tftpboot_self_config_files($core);
	$uid = $core->UserAuth->get_id();
	$svc = tftpboot_instance($core);
	foreach($files as &$f)
	{
		$f['label'] = tftpboot_display_label($f['phone'], $f['mac']);
		$pending = $svc->get_self_pending_status($uid, $f['filename']);
		$f['moderation'] = $pending ? array(
			'status' => $pending['status'],
			'created' => $pending['created'],
			'reject_note' => $pending['reject_note'],
		) : NULL;
	}
	unset($f);
	tftpboot_json_send(array('code' => 0, 'files' => $files));
}