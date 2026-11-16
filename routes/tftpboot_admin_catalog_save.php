<?php

function tftpboot_admin_catalog_save(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);
	$svc = tftpboot_instance($core);
	$catalog = isset($post_data['catalog']) ? json_decode($post_data['catalog'], TRUE) : NULL;
	if(!is_array($catalog))
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid catalog'));
		exit;
	}

	$svc->save_catalog($catalog);

	if(isset($post_data['editor_vendors']) && is_array($post_data['editor_vendors'])
		&& isset($post_data['bulk_vendors']) && is_array($post_data['bulk_vendors']))
	{
		$svc->set_enabled_vendors($post_data['editor_vendors'], $post_data['bulk_vendors']);
	}

	$settings_map = array(
		'tftpboot_sync_source' => 'sync_source',
		'tftpboot_sync_api_url' => 'sync_api_url',
		'tftpboot_sync_api_key' => 'sync_api_key',
		'tftpboot_sync_custom_url' => 'sync_custom_url',
		'tftpboot_sync_auto' => 'sync_auto',
		'tftpboot_sync_auto_interval' => 'sync_auto_interval',
		'tftpboot_sync_fields' => 'sync_fields',
		'tftpboot_scan_cache_ttl' => 'scan_cache_ttl',
	);
	foreach($settings_map as $cfg_key => $post_key)
	{
		if(isset($post_data[$post_key]))
		{
			$core->Config->set_global($cfg_key, trim((string)$post_data[$post_key]));
		}
	}

	if(isset($post_data['bulk_page_size']))
	{
		$n = intval($post_data['bulk_page_size']);
		if($n < 5)
		{
			$n = 5;
		}
		if($n > 500)
		{
			$n = 500;
		}

		$core->Config->set_global('tftpboot_bulk_page_size', (string) $n);
	}

	if(isset($post_data['moderation_poll_interval']))
	{
		$n = intval($post_data['moderation_poll_interval']);
		if($n < 60)
		{
			$n = 60;
		}

		$core->Config->set_global('tftpboot_moderation_poll_interval', (string) $n);
	}

	if(isset($post_data['moderation_max_per_hour']))
	{
		$n = intval($post_data['moderation_max_per_hour']);
		if($n < 1)
		{
			$n = 1;
		}

		$core->Config->set_global('tftpboot_moderation_max_per_hour', (string) $n);
	}

	if(isset($post_data['bulk_lookup_min_digits']))
	{
		$n = intval($post_data['bulk_lookup_min_digits']);
		if($n < 1)
		{
			$n = 1;
		}
		if($n > 11)
		{
			$n = 11;
		}

		$core->Config->set_global('tftpboot_bulk_lookup_min_digits', (string) $n);
	}

	if(isset($post_data['bulk_lookup_min_name']))
	{
		$n = intval($post_data['bulk_lookup_min_name']);
		if($n < 1)
		{
			$n = 1;
		}
		if($n > 30)
		{
			$n = 30;
		}

		$core->Config->set_global('tftpboot_bulk_lookup_min_name', (string) $n);
	}

	log_db('tftpboot admin catalog save', '', 0);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save')));
}
