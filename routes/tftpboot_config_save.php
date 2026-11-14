<?php

function tftpboot_config_save(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	if(tftpboot_is_self_only_user($core))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootUseModerationSubmit')));
		exit;
	}
	assert_tftpboot_ajax($core);
	$filename = isset($post_data['filename']) ? trim($post_data['filename']) : '';
	$policy = tftpboot_user_policy($core);
	if($policy['mode'] === 'buttons_only')
	{
		unset($post_data['sip']);
		unset($post_data['displayName']);
	}

	$svc = tftpboot_instance($core);
	$result = $svc->save_config($filename, $post_data, $policy);
	tftpboot_json_send($result);
}
