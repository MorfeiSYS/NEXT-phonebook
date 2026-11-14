<?php

function tftpboot_admin(&$core, $params, $post_data)
{
	if(!user_is_admin())
	{
		assert_admin_page($core);
	}

	$svc = tftpboot_instance($core);
	$tftpboot_catalog = $svc->get_catalog();
	$tftpboot_unknown = $svc->list_unknown_files();
	$tftpboot_enabled_editor = $svc->get_enabled_vendors('editor');
	$tftpboot_enabled_bulk = $svc->get_enabled_vendors('bulk');
	$tftpboot_policies = $svc->get_policies();
	$tftpboot_settings = array(
		'sync_source' => $core->Config->get_global('tftpboot_sync_source', 'phonebook'),
		'sync_api_url' => $core->Config->get_global('tftpboot_sync_api_url', ''),
		'sync_api_key' => $core->Config->get_global('tftpboot_sync_api_key', ''),
		'sync_custom_url' => $core->Config->get_global('tftpboot_sync_custom_url', ''),
		'sync_auto' => $core->Config->get_global('tftpboot_sync_auto', '0'),
		'sync_auto_interval' => $core->Config->get_global('tftpboot_sync_auto_interval', '60'),
		'sync_fields' => $core->Config->get_global('tftpboot_sync_fields', 'dss_title,display_name'),
		'scan_cache_ttl' => $core->Config->get_global('tftpboot_scan_cache_ttl', '300'),
		'sync_cron_key' => $core->Config->get_global('tftpboot_sync_cron_key', ''),
	);

	include(TEMPLATES_DIR.'tpl.tftpboot-admin.php');
}
