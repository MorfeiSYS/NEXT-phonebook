<?php

function tftpboot_admin_override_save(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);
	$filename = isset($post_data['filename']) ? trim($post_data['filename']) : '';
	$vendor = isset($post_data['vendor']) ? trim($post_data['vendor']) : '';
	$model = isset($post_data['model']) ? trim($post_data['model']) : '';
	if($filename === '' || $vendor === '')
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('NotAllFilled')));
		exit;
	}

	$svc = tftpboot_instance($core);
	$svc->save_override($filename, $vendor, $model !== '' ? $model : 'unknown');
	log_db('tftpboot override save', 'file='.$filename.';vendor='.$vendor, 0);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save')));
}
