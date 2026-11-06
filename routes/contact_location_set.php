<?php

function contact_location_set(&$core, $params, $post_data)
{
	global $g_maps_catalog;

	$id = intval(@$post_data['id']);
	$map_id = intval(@$post_data['map']);
	$pos_x = intval(@$post_data['x']);
	$pos_y = intval(@$post_data['y']);

	assert_permission_ajax(0, PB_ACCESS_OPERATOR);

	// Client bug (historical): `var map` in pb.js shadowed the global numeric map id, so drag-save sent map=0 with real coords.
	// True "remove from map" sends map=0 and x=y=0 (f_map_unset).
	if($map_id === 0 && $id && ($pos_x !== 0 || $pos_y !== 0))
	{
		$rows = array();
		if($core->db->select_assoc_ex($rows, rpv('SELECT `map` FROM `@contacts` WHERE `id` = # LIMIT 1', $id)) && !empty($rows))
		{
			$prev_map = intval($rows[0]['map']);
			if($prev_map > 0 && maps_catalog_map_exists($g_maps_catalog, $prev_map))
			{
				$map_id = $prev_map;
			}
		}
	}

	// map_id 0 = remove from map (see f_map_unset in pb.js); only positive ids must exist in catalog
	if($map_id !== 0 && !maps_catalog_map_exists($g_maps_catalog, $map_id))
	{
		echo '{"code": 1, "message": "Invalid map identifier"}';
		exit;
	}

	$core->db->put(rpv('UPDATE `@contacts` SET `map` = #, `x` = #, `y` = # WHERE `id` = # LIMIT 1', $map_id, $pos_x, $pos_y, $id));

	echo '{"code": 0, "id": '.$id.', "map": '.json_escape($map_id).', "x": '.json_escape($pos_x).', "y": '.json_escape($pos_y).', "message": "Location set (ID '.$id.')"}';
}

