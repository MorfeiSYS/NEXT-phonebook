<?php

function tools(&$core, $params, $post_data)
{
	assert_admin_page($core);

	$config = array();
	$core->db->select_assoc_ex($config, rpv('SELECT m.`uid`, m.`name`, m.`value`, m.`description` FROM @config AS m WHERE m.`uid` = 0 OR m.`uid` = # ORDER BY m.`uid`, m.`name`', $core->UserAuth->get_id()));

	$tftpboot_enabled_editor = array();
	$tftpboot_enabled_bulk = array();
	$tftpboot_unknown = array();
	$tftpboot_policies = array();
	$tftpboot_catalog = array('vendors' => array());
	$tftpboot_settings = array();
	$tools_has_tftpboot_admin = user_is_admin();

	if($tools_has_tftpboot_admin)
	{
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
			'bulk_page_size' => (string) $svc->get_bulk_page_size(),
			'sync_cron_key' => $core->Config->get_global('tftpboot_sync_cron_key', ''),
		);
	}

	include(TEMPLATES_DIR.'tpl.tools.php');
}
