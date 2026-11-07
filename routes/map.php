<?php

function map(&$core, $params, $post_data)
{
	global $g_maps_catalog;

	$catalog = $g_maps_catalog;

	$path_has_map_segment = array_key_exists(1, $params) && $params[1] !== '';
	$requested_map_id = $path_has_map_segment ? intval($params[1]) : 0;

	$map_id = $requested_map_id;
	if(!maps_catalog_map_exists($catalog, $map_id))
	{
		$first_id = maps_catalog_first_map_id($catalog);
		if($first_id > 0)
		{
			$map_id = $first_id;
		}
		else
		{
			$error_msg = 'Map catalog is empty or invalid; add maps in config/maps_catalog.json.';
			include(TEMPLATES_DIR.'tpl.error.php');
			return;
		}
	}

	// Canonical URL when id missing or not in catalog — avoids showing the wrong floor under a stale path
	if($path_has_map_segment && $requested_map_id !== $map_id)
	{
		header('Location: '.WEB_LINK_PREFIX.'map/'.$map_id);
		exit;
	}

	$map_entry = isset($catalog['byId'][$map_id]) ? $catalog['byId'][$map_id] : null;
	$map_image_src = $map_entry ? maps_catalog_image_public_path($map_entry) : ('photos/map'.$map_id.'.png');

	$contacts = array();
	$core->db->select_assoc_ex($contacts, rpv('
			SELECT
				m.`id`,
				m.`first_name`,
				m.`last_name`,
				m.`middle_name`,
				m.`department`,
				m.`organization`,
				m.`position`,
				m.`phone_internal`,
				m.`phone_external`,
				m.`phone_mobile`,
				m.`mail`,
				m.`x`,
				m.`y`,
				m.`type`,
				m.`flags`
			FROM `@contacts` AS m
			WHERE
				(m.`flags` & {%PB_CONTACT_VISIBLE}) = {%PB_CONTACT_VISIBLE}
				AND NOT (((m.`flags` & {%PB_CONTACT_LIST_HIDDEN}) = {%PB_CONTACT_LIST_HIDDEN}) AND ((m.`flags` & ({%PB_CONTACT_AD_DELETED} | {%PB_CONTACT_AD_DISABLED})) <> 0))
				AND m.`map` = #
			ORDER BY
				m.`last_name`,
				m.`first_name`,
				m.`middle_name`,
				m.`id`
		',
		$map_id
	));

	include(TEMPLATES_DIR.'tpl.map.php');
}

