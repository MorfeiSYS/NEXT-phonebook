<?php

function tftpboot(&$core, $params, $post_data)
{
	if(!user_has_tftpboot_access($core))
	{
		$error_msg = LL('AccessDenied');
		include(TEMPLATES_DIR.'tpl.message.php');
		exit;
	}

	$svc = tftpboot_instance($core);
	$svc->scan(FALSE);
	$tftpboot_policy = tftpboot_user_policy($core);
	$tftpboot_is_admin = user_is_admin();
	$tftpboot_enabled_bulk = tftpboot_bulk_vendor_choices($svc);
	$tftpboot_bulk_page_size = $svc->get_bulk_page_size();
	$tftpboot_sync_api_fetch = tftpboot_sync_api_configured($core);
	$tftpboot_sync_has_undo = tftpboot_sync_undo_load($core) !== NULL;

	include(TEMPLATES_DIR.'tpl.tftpboot.php');
}
