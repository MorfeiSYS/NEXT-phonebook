<?php
/*
 * Map catalog: grouped list with image paths, synced with contact/map numeric ids.
 * Edit config/maps_catalog.json to add locations or floors (ids must match DB and photos/map{id}.png for uploads).
 */

if(!defined('Z_PROTECTED')) exit;

function maps_catalog_json_path()
{
	return ROOT_DIR.'config'.DIRECTORY_SEPARATOR.'maps_catalog.json';
}

function maps_catalog_is_absolute_url($path)
{
	return (bool) preg_match('#^https?://#i', (string) $path);
}

/**
 * @param array $entry normalized map row
 * @return string path or URL for ls() / HTML attributes
 */
function maps_catalog_image_public_path($entry)
{
	$img = isset($entry['image']) ? (string) $entry['image'] : '';
	if($img === '')
	{
		return 'photos/map'.intval($entry['id']).'.png';
	}

	return $img;
}

/**
 * Build catalog from legacy map_names_json (flat list, sequential ids 1..n).
 *
 * @param array $map_names
 * @return array{ categories: array, byId: array<int,array>, flat: array<int,array> }
 */
function maps_catalog_from_legacy_names($map_names)
{
	if(!is_array($map_names))
	{
		$map_names = array();
	}

	$maps = array();
	foreach($map_names as $idx => $name)
	{
		$id = $idx + 1;
		$maps[] = array(
			'id' => $id,
			'title' => (string) $name,
			'sort' => ($idx + 1) * 10,
			'image' => 'photos/map'.$id.'.png',
		);
	}

	$categories = array(
		array(
			'category' => '',
			'sort' => 0,
			'maps' => $maps,
		),
	);

	return maps_catalog_normalize($categories);
}

/**
 * @param array $categories raw categories from JSON
 * @return array{ categories: array, byId: array<int,array>, flat: array<int,array> }
 */
function maps_catalog_normalize($categories)
{
	$byId = array();
	$flat = array();

	if(!is_array($categories))
	{
		$categories = array();
	}

	usort($categories, function ($a, $b) {
		return intval(@$a['sort']) - intval(@$b['sort']);
	});

	foreach($categories as &$cat)
	{
		if(!is_array(@$cat['maps']))
		{
			$cat['maps'] = array();
		}

		usort($cat['maps'], function ($a, $b) {
			return intval(@$a['sort']) - intval(@$b['sort']);
		});

		foreach($cat['maps'] as &$m)
		{
			$id = intval(@$m['id']);
			if($id < 1)
			{
				continue;
			}

			$entry = array(
				'id' => $id,
				'category' => isset($cat['category']) ? (string) $cat['category'] : '',
				'title' => isset($m['title']) ? (string) $m['title'] : ('#'.$id),
				'sort' => isset($m['sort']) ? intval($m['sort']) : 0,
				'image' => isset($m['image']) ? (string) $m['image'] : ('photos/map'.$id.'.png'),
			);

			$byId[$id] = $entry;
			$flat[] = $entry;
		}
		unset($m);
	}
	unset($cat);

	usort($flat, function ($a, $b) {
		$c = strcmp((string) @$a['category'], (string) @$b['category']);
		if($c !== 0)
		{
			return $c;
		}

		return intval(@$a['sort']) - intval(@$b['sort']);
	});

	return array(
		'categories' => $categories,
		'byId' => $byId,
		'flat' => $flat,
	);
}

/**
 * @param Core $core
 * @return array{ categories: array, byId: array<int,array>, flat: array<int,array> }
 */
function maps_catalog_load(&$core)
{
	$path = maps_catalog_json_path();
	if(is_readable($path))
	{
		$json = @file_get_contents($path);
		$data = json_decode($json, TRUE);
		if(is_array($data) && isset($data['categories']) && is_array($data['categories']))
		{
			return maps_catalog_normalize($data['categories']);
		}
	}

	$map_names = json_decode($core->Config->get_global('map_names_json', 0), TRUE);
	return maps_catalog_from_legacy_names(is_array($map_names) ? $map_names : array());
}

function maps_catalog_map_exists(&$catalog, $map_id)
{
	$map_id = intval($map_id);

	return $map_id > 0 && isset($catalog['byId'][$map_id]);
}

/**
 * First map id in the same order as the main "Карты" dropdown (category sort, then map sort within category).
 *
 * @param array $catalog
 * @return int 0 if catalog has no maps
 */
function maps_catalog_first_map_id(&$catalog)
{
	if(!is_array($catalog) || !isset($catalog['categories']) || !is_array($catalog['categories']))
	{
		return 0;
	}

	foreach($catalog['categories'] as $cat)
	{
		$maps = (isset($cat['maps']) && is_array($cat['maps'])) ? $cat['maps'] : array();
		if(!count($maps))
		{
			continue;
		}

		foreach($maps as $m)
		{
			$mid = intval(@$m['id']);
			if($mid >= 1)
			{
				return $mid;
			}
		}
	}

	return 0;
}

/**
 * Main menu: Карты &rarr; выбор этажа (вложенное подменю по локации).
 *
 * @param array $catalog
 */
function maps_catalog_echo_main_submenu(&$catalog)
{
	foreach($catalog['categories'] as $cat)
	{
		$maps = (isset($cat['maps']) && is_array($cat['maps'])) ? $cat['maps'] : array();
		if(!count($maps))
		{
			continue;
		}

		$label = trim(isset($cat['category']) ? (string) $cat['category'] : '');
		if($label !== '')
		{
			echo '<li class="menu-item maps-submenu-cat">';
			echo '<a href="#" onclick="return false;">'.htmlspecialchars($label, ENT_QUOTES, 'UTF-8').'</a>';
			echo '<ul class="submenu maps-submenu-nested">';
			foreach($maps as $m)
			{
				$mid = intval(@$m['id']);
				if($mid < 1)
				{
					continue;
				}
				$title = isset($m['title']) ? (string) $m['title'] : ('#'.$mid);
				echo '<li><a href="'.htmlspecialchars(WEB_LINK_PREFIX.'map/'.$mid, ENT_QUOTES, 'UTF-8').'">'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</a></li>';
			}
			echo '</ul></li>';
		}
		else
		{
			foreach($maps as $m)
			{
				$mid = intval(@$m['id']);
				if($mid < 1)
				{
					continue;
				}
				$title = isset($m['title']) ? (string) $m['title'] : ('#'.$mid);
				echo '<li><a href="'.htmlspecialchars(WEB_LINK_PREFIX.'map/'.$mid, ENT_QUOTES, 'UTF-8').'">'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</a></li>';
			}
		}
	}
}

/**
 * Ссылки переключения карт под заголовком страницы карты (по группам).
 *
 * @param array $catalog
 */
function maps_catalog_echo_page_heading_links(&$catalog)
{
	$first_block = TRUE;

	foreach($catalog['categories'] as $cat)
	{
		$maps = (isset($cat['maps']) && is_array($cat['maps'])) ? $cat['maps'] : array();
		if(!count($maps))
		{
			continue;
		}

		$label = trim(isset($cat['category']) ? (string) $cat['category'] : '');

		if(!$first_block)
		{
			echo '&nbsp;&nbsp;';
		}
		$first_block = FALSE;

		if($label !== '')
		{
			echo '<span class="map-inline-group"><span class="map-inline-cat">'.htmlspecialchars($label, ENT_QUOTES, 'UTF-8').':</span> ';
		}

		foreach($maps as $m)
		{
			$mid = intval(@$m['id']);
			if($mid < 1)
			{
				continue;
			}
			$title = isset($m['title']) ? (string) $m['title'] : ('#'.$mid);
			echo '<a href="'.htmlspecialchars(WEB_LINK_PREFIX.'map/'.$mid, ENT_QUOTES, 'UTF-8').'">'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</a> ';
		}

		if($label !== '')
		{
			echo '</span>';
		}
	}
}
