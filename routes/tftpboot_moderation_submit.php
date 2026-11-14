<?php

function tftpboot_moderation_submit(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_self_ajax($core);
	$filename = isset($post_data['filename']) ? trim($post_data['filename']) : '';
	assert_tftpboot_self_file($core, $filename);

	$contact = tftpboot_self_contact($core);
	if(!$contact)
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('AccessDenied')));
		exit;
	}

	$policy = array('mode' => 'buttons_only', 'sections' => array('dss'));
	unset($post_data['sip']);
	unset($post_data['displayName']);

	$svc = tftpboot_instance($core);
	$result = $svc->submit_moderation_request(
		$core->UserAuth->get_id(),
		intval($contact['id']),
		$filename,
		$post_data,
		$policy
	);
	tftpboot_json_send($result);
}