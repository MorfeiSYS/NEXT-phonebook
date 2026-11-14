<?php

function tftpboot_config_get(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_config_ajax($core);
	$filename = isset($post_data['filename']) ? trim($post_data['filename']) : '';
	if(tftpboot_is_self_only_user($core))
	{
		assert_tftpboot_self_file($core, $filename);
		$policy = array('mode' => 'buttons_only', 'sections' => array('dss'));
	}
	else
	{
		assert_tftpboot_ajax($core);
		$policy = tftpboot_user_policy($core);
	}
	$svc = tftpboot_instance($core);
	$config = $svc->get_config_for_editor($filename, $policy);
	if(!$config)
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Not found'));
		exit;
	}

	tftpboot_json_send(array('code' => 0, 'config' => $config));
}
