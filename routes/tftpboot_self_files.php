<?php

function tftpboot_self_files(&$core, $params, $post_data)
{
	assert_tftpboot_self_ajax($core);
	$files = tftpboot_self_config_files($core);
	$uid = $core->UserAuth->get_id();
	$svc = tftpboot_instance($core);
	foreach($files as &$f)
	{
		$phone = trim((string)$f['phone']);
		$f['label'] = $phone !== '' ? $phone : basename((string)$f['filename']);
		$f['can_edit'] = !$svc->self_has_pending_moderation($uid, $f['filename']);
		$f['moderation'] = $svc->get_self_moderation_ui_status($uid, $f['filename']);
	}
	unset($f);
	tftpboot_json_send(array('code' => 0, 'files' => $files));
}