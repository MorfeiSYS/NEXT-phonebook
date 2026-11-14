<?php

require_once MODULES_DIR.'tftpboot'.DIRECTORY_SEPARATOR.'parsers'.DIRECTORY_SEPARATOR.'FanvilParser.php';
require_once MODULES_DIR.'tftpboot'.DIRECTORY_SEPARATOR.'parsers'.DIRECTORY_SEPARATOR.'CiscoXmlParser.php';
require_once MODULES_DIR.'tftpboot'.DIRECTORY_SEPARATOR.'parsers'.DIRECTORY_SEPARATOR.'YealinkParser.php';
require_once MODULES_DIR.'tftpboot'.DIRECTORY_SEPARATOR.'parsers'.DIRECTORY_SEPARATOR.'GrandstreamParser.php';
require_once MODULES_DIR.'tftpboot'.DIRECTORY_SEPARATOR.'parsers'.DIRECTORY_SEPARATOR.'EltexParser.php';
require_once MODULES_DIR.'tftpboot'.DIRECTORY_SEPARATOR.'sync'.DIRECTORY_SEPARATOR.'SyncSources.php';

class TftpBoot
{
	private $core;
	private $fanvil;
	private $cisco;
	private $yealink;
	private $grandstream;
	private $eltex;
	private $scan_suggested_models = array();

	public function __construct(&$core)
	{
		$this->core = $core;
		$this->fanvil = new TftpFanvilParser();
		$this->cisco = new TftpCiscoXmlParser();
		$this->yealink = new TftpYealinkParser();
		$this->grandstream = new TftpGrandstreamParser();
		$this->eltex = new TftpEltexParser();
	}

	private function catalog_from_file()
	{
		$path = ROOT_DIR.'config/tftpboot_catalog.json';
		if(!file_exists($path))
		{
			return NULL;
		}

		$data = json_decode(file_get_contents($path), TRUE);
		if(!is_array($data) || !isset($data['vendors']))
		{
			return NULL;
		}

		return $data;
	}

	private function merge_catalog_defs(&$data, $defs)
	{
		if(!isset($data['vendors']) || !isset($defs['vendors']))
		{
			return;
		}

		$by_id = array();
		foreach($data['vendors'] as $i => $v)
		{
			$by_id[$v['id']] = $i;
		}

		foreach($defs['vendors'] as $dv)
		{
			if(!isset($dv['id']))
			{
				continue;
			}

			if(!isset($by_id[$dv['id']]))
			{
				$data['vendors'][] = $dv;
				$by_id[$dv['id']] = count($data['vendors']) - 1;
				continue;
			}

			$vi = $by_id[$dv['id']];
			if(!isset($data['vendors'][$vi]['models']) || !isset($dv['models']))
			{
				continue;
			}

			$models = array();
			foreach($data['vendors'][$vi]['models'] as $m)
			{
				$models[$m['id']] = $m;
			}

			foreach($dv['models'] as $dm)
			{
				if(!isset($dm['id']))
				{
					continue;
				}

				if($dv['id'] === 'fanvil' && $dm['id'] === 'other' && isset($models['unknown']))
				{
					unset($models['unknown']);
				}

				if(isset($models[$dm['id']]))
				{
					foreach(array('title', 'match', 'dss_slots', 'sections') as $key)
					{
						if(isset($dm[$key]))
						{
							$models[$dm['id']][$key] = $dm[$key];
						}
					}
				}
				else
				{
					$models[$dm['id']] = $dm;
				}
			}

			$data['vendors'][$vi]['models'] = array_values($models);
		}
	}

	public function get_catalog()
	{
		$json = $this->core->Config->get_global('tftpboot_catalog_json', '');
		$data = json_decode($json, TRUE);
		if(!is_array($data) || !isset($data['vendors']))
		{
			$data = $this->catalog_from_file();
		}

		if(!is_array($data) || !isset($data['vendors']))
		{
			$data = array('vendors' => array());
		}

		$defs = $this->catalog_from_file();
		if($defs)
		{
			$this->merge_catalog_defs($data, $defs);
		}

		return $data;
	}

	public function save_catalog($data)
	{
		$json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
		$this->core->Config->set_global('tftpboot_catalog_json', $json);

		return TRUE;
	}

	public function get_bulk_page_size()
	{
		$n = intval($this->core->Config->get_global('tftpboot_bulk_page_size', 50));
		if($n < 5)
		{
			$n = 5;
		}
		if($n > 500)
		{
			$n = 500;
		}

		return $n;
	}

	public function get_enabled_vendors($kind = 'editor')
	{
		$json = $this->core->Config->get_global('tftpboot_vendor_enabled_json', '');
		$data = json_decode($json, TRUE);
		if(!is_array($data))
		{
			$data = array('editor' => array('fanvil'), 'bulk' => array('fanvil'));
		}

		$key = ($kind === 'bulk') ? 'bulk' : 'editor';

		return isset($data[$key]) ? $data[$key] : array();
	}

	public function set_enabled_vendors($editor, $bulk)
	{
		$this->core->Config->set_global('tftpboot_vendor_enabled_json', json_encode(array(
			'editor' => array_values($editor),
			'bulk' => array_values($bulk),
		)));
	}

	public function resolve_path($filename)
	{
		$filename = str_replace(array('\\', '/'), DIRECTORY_SEPARATOR, $filename);
		$filename = basename($filename);
		$root = realpath(tftpboot_dir());
		if(!$root)
		{
			return FALSE;
		}

		$full = realpath($root.DIRECTORY_SEPARATOR.$filename);
		if(!$full || strpos($full, $root) !== 0)
		{
			return FALSE;
		}

		if(!preg_match('/\.(cfg|xml)$/i', $filename))
		{
			return FALSE;
		}

		return $full;
	}

	public function mac_from_filename($filename)
	{
		$base = pathinfo($filename, PATHINFO_FILENAME);
		if(preg_match('/^SEP([0-9A-Fa-f]{12})$/i', $base, $m))
		{
			return strtoupper($m[1]);
		}
		if(preg_match('/^cfg([0-9A-Fa-f]{12})$/i', $base, $m))
		{
			return strtoupper($m[1]);
		}
		if(preg_match('/^([0-9A-Fa-f]{12})$/', $base, $m))
		{
			return strtoupper($m[1]);
		}
		if(preg_match('/^([0-9A-Fa-f]{2}(?:\.[0-9A-Fa-f]{2}){5})$/i', $base, $m))
		{
			return strtoupper(str_replace('.', '', $m[1]));
		}

		return strtoupper($base);
	}

	public function fanvil_key_item_match($key, $item)
	{
		if(isset($item['key_id']) && $item['key_id'] !== '' && isset($key['key_id']))
		{
			return $key['key_id'] === $item['key_id'];
		}

		if(isset($item['section']) && $item['section'] !== '' && isset($key['section']))
		{
			return $key['section'] === $item['section'] && intval($key['slot']) === intval($item['slot']);
		}

		return intval($key['slot']) === intval($item['slot']);
	}

	public function fanvil_vendor_class_id($content)
	{
		if(preg_match_all('/^\s*Vendor Class ID\s+:\s*(.*)\s*$/mi', $content, $m) && count($m[1]) > 0)
		{
			return trim(end($m[1]));
		}

		return '';
	}

	public function detect_vendor($filename, $content)
	{
		$content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
		$base = strtolower($filename);
		if(preg_match('/^sep[a-f0-9]+\.cnf\.xml$/i', $base))
		{
			return 'cisco';
		}
		if(preg_match('/^cfg[a-f0-9]+\.xml$/i', $base))
		{
			return 'grandstream';
		}
		if(strpos($content, '<<VOIP CONFIG FILE>>') !== FALSE)
		{
			return 'fanvil';
		}
		if(strpos($content, '#!version:') === 0 || strpos($content, '#!version') === 0)
		{
			return 'yealink';
		}
		if(strpos($content, '<gs_provision') !== FALSE)
		{
			return 'grandstream';
		}
		if(strpos($content, 'FXS0:') !== FALSE || strpos($content, '#!version 20') === 0)
		{
			return 'eltex';
		}

		return 'unknown';
	}

	public function parse_content($vendor, $content)
	{
		switch($vendor)
		{
			case 'fanvil': return $this->fanvil->parse($content);
			case 'cisco': return $this->cisco->parse($content);
			case 'yealink': return $this->yealink->parse($content);
			case 'grandstream': return $this->grandstream->parse($content);
			case 'eltex': return $this->eltex->parse($content);
			default: return array('vendor' => $vendor, 'phone' => '', 'speedDialKeys' => array());
		}
	}

	public function parser_for($vendor)
	{
		switch($vendor)
		{
			case 'fanvil': return $this->fanvil;
			case 'cisco': return $this->cisco;
			case 'yealink': return $this->yealink;
			case 'grandstream': return $this->grandstream;
			case 'eltex': return $this->eltex;
			default: return NULL;
		}
	}

	private function is_catalog_fallback_model_id($model_id)
	{
		return in_array($model_id, array('other', 'unknown', 'generic'), TRUE);
	}

	public function catalog_hint_matched_specific($vendor, $model_hint, $catalog)
	{
		$model_hint = trim($model_hint);
		if($model_hint === '')
		{
			return FALSE;
		}

		foreach($catalog['vendors'] as $v)
		{
			if($v['id'] !== $vendor)
			{
				continue;
			}

			foreach($v['models'] as $m)
			{
				if($this->is_catalog_fallback_model_id($m['id']))
				{
					continue;
				}

				if(!isset($m['match']) || !is_array($m['match']))
				{
					continue;
				}

				foreach($m['match'] as $needle)
				{
					if($needle !== '' && stripos($model_hint, $needle) !== FALSE)
					{
						return TRUE;
					}
				}
			}
		}

		return FALSE;
	}

	public function fanvil_max_fkey_slot($content)
	{
		$max = 0;
		if(preg_match_all('/^Fkey(\d+)\s+/m', $content, $m))
		{
			foreach($m[1] as $slot)
			{
				$n = intval($slot);
				if($n > $max)
				{
					$max = $n;
				}
			}
		}

		return $max;
	}

	private function model_id_from_hint($vendor, $hint)
	{
		$hint = trim($hint);
		$id = strtolower(preg_replace('/[^a-z0-9]+/i', '', $hint));
		if(strpos($id, $vendor) === 0)
		{
			$id = substr($id, strlen($vendor));
		}

		$id = trim($id, '-_');
		if($id === '')
		{
			$id = 'model';
		}

		return substr($id, 0, 32);
	}

	private function model_title_from_hint($hint)
	{
		$hint = trim($hint);
		if(preg_match('/Fanvil\s+(.+)$/i', $hint, $m))
		{
			return trim($m[1]);
		}

		return $hint;
	}

	private function default_sections_for_vendor($vendor)
	{
		switch($vendor)
		{
			case 'fanvil': return array('sip', 'dss', 'net');
			case 'cisco':
			case 'yealink': return array('sip', 'dss');
			case 'grandstream':
			case 'eltex': return array('sip');
			default: return array('dss');
		}
	}

	public function reset_scan_suggestions()
	{
		$this->scan_suggested_models = array();
	}

	public function get_scan_suggestions()
	{
		return array_values($this->scan_suggested_models);
	}

	private function note_scan_suggestion($vendor, $model_hint, $content, $assigned_model)
	{
		$model_hint = trim($model_hint);
		if($model_hint === '' || !$this->is_catalog_fallback_model_id($assigned_model))
		{
			return;
		}

		$catalog = $this->get_catalog();
		if($this->catalog_hint_matched_specific($vendor, $model_hint, $catalog))
		{
			return;
		}

		$key = $vendor."\0".$model_hint;
		if(!isset($this->scan_suggested_models[$key]))
		{
			$dss_slots = 16;
			if($vendor === 'fanvil')
			{
				$n = $this->fanvil_max_fkey_slot($content);
				if($n > 0)
				{
					$dss_slots = $n;
				}
			}

			$mid = $this->model_id_from_hint($vendor, $model_hint);
			$this->scan_suggested_models[$key] = array(
				'vendor' => $vendor,
				'hint' => $model_hint,
				'suggested_id' => $mid,
				'suggested_title' => $this->model_title_from_hint($model_hint),
				'dss_slots' => $dss_slots,
				'sections' => $this->default_sections_for_vendor($vendor),
				'match' => array($model_hint),
				'file_count' => 0,
			);
		}

		$this->scan_suggested_models[$key]['file_count']++;
	}

	public function add_catalog_suggested_models($models)
	{
		if(!is_array($models) || !count($models))
		{
			return 0;
		}

		$catalog = $this->get_catalog();
		$added = 0;

		foreach($models as $entry)
		{
			if(!is_array($entry))
			{
				continue;
			}

			$vendor = isset($entry['vendor']) ? $entry['vendor'] : '';
			$model_id = isset($entry['suggested_id']) ? $entry['suggested_id'] : '';
			if($vendor === '' || $model_id === '' || $this->is_catalog_fallback_model_id($model_id))
			{
				continue;
			}

			$vi = NULL;
			foreach($catalog['vendors'] as $i => $v)
			{
				if($v['id'] === $vendor)
				{
					$vi = $i;
					break;
				}
			}

			if($vi === NULL)
			{
				continue;
			}

			$exists = FALSE;
			foreach($catalog['vendors'][$vi]['models'] as $m)
			{
				if($m['id'] === $model_id)
				{
					$exists = TRUE;
					break;
				}
			}

			if($exists)
			{
				continue;
			}

			$match = isset($entry['match']) && is_array($entry['match']) ? $entry['match'] : array();
			if(!count($match) && isset($entry['hint']))
			{
				$match = array($entry['hint']);
			}

			$new_model = array(
				'id' => $model_id,
				'title' => isset($entry['suggested_title']) ? $entry['suggested_title'] : $model_id,
				'match' => $match,
				'dss_slots' => isset($entry['dss_slots']) ? intval($entry['dss_slots']) : 16,
				'sections' => isset($entry['sections']) && is_array($entry['sections'])
					? $entry['sections']
					: $this->default_sections_for_vendor($vendor),
			);

			$insert_at = count($catalog['vendors'][$vi]['models']);
			foreach($catalog['vendors'][$vi]['models'] as $mi => $m)
			{
				if($this->is_catalog_fallback_model_id($m['id']))
				{
					$insert_at = $mi;
					break;
				}
			}

			array_splice($catalog['vendors'][$vi]['models'], $insert_at, 0, array($new_model));
			$added++;
		}

		if($added > 0)
		{
			$this->save_catalog($catalog);
			$this->write_catalog_file($catalog);
			$this->scan(TRUE);
		}

		return $added;
	}

	private function write_catalog_file($catalog)
	{
		$path = ROOT_DIR.'config/tftpboot_catalog.json';
		$json = json_encode($catalog, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
		if($json === FALSE)
		{
			return FALSE;
		}

		return @file_put_contents($path, $json."\n") !== FALSE;
	}

	public function match_model($vendor, $model_hint, $catalog)
	{
		foreach($catalog['vendors'] as $v)
		{
			if($v['id'] !== $vendor)
			{
				continue;
			}

			foreach($v['models'] as $m)
			{
				if($m['id'] === 'unknown' || $m['id'] === 'other')
				{
					continue;
				}

				foreach($m['match'] as $needle)
				{
					if($needle !== '' && stripos($model_hint, $needle) !== FALSE)
					{
						return $m['id'];
					}
				}
			}

			foreach($v['models'] as $m)
			{
				if($m['id'] === 'unknown' || $m['id'] === 'other')
				{
					return $m['id'];
				}
			}

			return isset($v['models'][0]['id']) ? $v['models'][0]['id'] : 'unknown';
		}

		return 'unknown';
	}

	public function get_override($filename)
	{
		$row = array();
		if($this->core->db->select_assoc_ex($row, rpv('SELECT `vendor`, `model` FROM `@tftpboot_override` WHERE `filename` = ! LIMIT 1', $filename)))
		{
			return $row[0];
		}

		return NULL;
	}

	public function should_scan()
	{
		$ttl = intval($this->core->Config->get_global('tftpboot_scan_cache_ttl', 300));
		if($ttl <= 0)
		{
			return TRUE;
		}

		$cnt = array();
		if(!$this->core->db->select_ex($cnt, rpv('SELECT COUNT(*) AS c FROM `@tftpboot_file` LIMIT 1')))
		{
			return TRUE;
		}

		if(intval($cnt[0][0]) === 0)
		{
			return TRUE;
		}

		$last = array();
		if(!$this->core->db->select_ex($last, rpv('SELECT MAX(`mtime`) FROM `@tftpboot_file`')))
		{
			return TRUE;
		}

		return (time() - intval($last[0][0])) > $ttl;
	}

	public function ensure_dial_keys_column()
	{
		static $done = FALSE;
		if($done)
		{
			return;
		}

		$cols = array();
		if($this->core->db->select_ex($cols, rpv("SHOW COLUMNS FROM `@tftpboot_file` LIKE 'dial_keys_json'"))
			&& count($cols) > 0)
		{
			$done = TRUE;

			return;
		}

		$this->core->db->put(rpv(
			'ALTER TABLE `@tftpboot_file` ADD COLUMN `dial_keys_json` MEDIUMTEXT NULL AFTER `dss_search`'
		));
		$done = TRUE;
	}

	private function dial_keys_compact($parsed)
	{
		$out = array();
		if(!isset($parsed['speedDialKeys']) || !is_array($parsed['speedDialKeys']))
		{
			return $out;
		}

		foreach($parsed['speedDialKeys'] as $k)
		{
			$num = isset($k['number']) ? trim($k['number']) : '';
			if($this->normalize_dial_number($num) === '')
			{
				continue;
			}

			$entry = array(
				'number' => $num,
				'title' => isset($k['label']) ? $k['label'] : (isset($k['title']) ? $k['title'] : ''),
			);
			if(isset($k['line']) && intval($k['line']) > 0)
			{
				$entry['line'] = intval($k['line']);
			}

			$out[] = $entry;
		}

		return $out;
	}

	public function scan($force = FALSE)
	{
		$this->ensure_dial_keys_column();
		if(!$force && !$this->should_scan())
		{
			return TRUE;
		}

		if($force)
		{
			$this->reset_scan_suggestions();
		}

		$dir = tftpboot_dir();
		if(!is_dir($dir))
		{
			return FALSE;
		}

		$catalog = $this->get_catalog();
		$root_real = realpath($dir);
		if(!$root_real)
		{
			return FALSE;
		}

		foreach(scandir($dir) as $name)
		{
			if($name === '.' || $name === '..')
			{
				continue;
			}

			$this->index_disk_file($name, $catalog);
		}

		return TRUE;
	}

	private function is_tftpboot_filename($name)
	{
		if(!preg_match('/\.(cfg|xml)$/i', $name))
		{
			return FALSE;
		}

		if(preg_match('/^(F0V|f0v)/i', $name))
		{
			return FALSE;
		}

		return preg_match('/^[0-9a-f]{12}\.cfg$/i', $name)
			|| preg_match('/^SEP[0-9A-F]{12}\.cnf\.xml$/i', $name)
			|| preg_match('/^cfg[0-9A-F]{12}\.xml$/i', $name)
			|| preg_match('/^([0-9A-F]{2}\.){5}[0-9A-F]{2}\.cfg$/i', $name);
	}

	private function index_disk_file($filename, $catalog = NULL)
	{
		if(!$this->is_tftpboot_filename($filename))
		{
			return FALSE;
		}

		$path = tftpboot_dir().$filename;
		if(!is_file($path))
		{
			return FALSE;
		}

		$content = @file_get_contents($path);
		if($content === FALSE)
		{
			return FALSE;
		}

		if($catalog === NULL)
		{
			$catalog = $this->get_catalog();
		}

		$override = $this->get_override($filename);
		$vendor = $override ? $override['vendor'] : $this->detect_vendor($filename, $content);
		$parsed = $this->parse_content($vendor, $content);
		$hint = isset($parsed['model_hint']) ? $parsed['model_hint'] : '';
		if($vendor === 'fanvil' && $hint === '')
		{
			$hint = $this->fanvil_vendor_class_id($content);
		}
		$model = $override ? $override['model'] : $this->match_model($vendor, $hint, $catalog);
		if($vendor === 'fanvil' && $model === 'unknown')
		{
			$model = 'other';
		}
		if(!$override)
		{
			$this->note_scan_suggestion($vendor, $hint, $content, $model);
		}
		$mac = $this->mac_from_filename(basename($filename));
		$phone = isset($parsed['phone']) ? $parsed['phone'] : '';
		$parser = $this->parser_for($vendor);
		$dss = $parser ? $parser->build_dss_search($parsed) : '';
		$dial_keys_json = json_encode($this->dial_keys_compact($parsed), JSON_UNESCAPED_UNICODE);
		$mtime = filemtime($path);

		$this->core->db->put(rpv(
			"INSERT INTO `@tftpboot_file` (`filename`, `mac`, `vendor`, `model`, `phone`, `dss_search`, `dial_keys_json`, `mtime`, `auto_detected`) ".
			"VALUES (!, !, !, !, !, !, !, #, #) ON DUPLICATE KEY UPDATE `mac`=VALUES(`mac`), `vendor`=VALUES(`vendor`), ".
			"`model`=VALUES(`model`), `phone`=VALUES(`phone`), `dss_search`=VALUES(`dss_search`), `dial_keys_json`=VALUES(`dial_keys_json`), ".
			"`mtime`=VALUES(`mtime`), `auto_detected`=VALUES(`auto_detected`)",
			$filename,
			$mac,
			$vendor,
			$model,
			$phone,
			$dss,
			$dial_keys_json,
			$mtime,
			$override ? 0 : 1
		));

		return TRUE;
	}

	private function reindex_files($filenames)
	{
		if(!is_array($filenames) || !count($filenames))
		{
			return;
		}

		$catalog = $this->get_catalog();
		foreach(array_unique($filenames) as $filename)
		{
			$this->index_disk_file($filename, $catalog);
		}
	}

	private function fetch_tftpboot_vendor_rows($vendors)
	{
		$rows = array();
		if(!count($vendors))
		{
			return $rows;
		}

		$this->core->db->select_assoc_ex($rows, rpv(
			'SELECT `filename`, `vendor`, `phone`, `dial_keys_json` FROM `@tftpboot_file` WHERE `vendor` IN ({r0}) ORDER BY `filename`',
			$this->vendors_in_sql($vendors)
		));

		return $rows;
	}

	public function backfill_dial_keys_json($vendors, $limit = 100)
	{
		if(!count($vendors) || $limit <= 0)
		{
			return 0;
		}

		$todo = array();
		$this->core->db->select_assoc_ex($todo, rpv(
			'SELECT `filename`, `vendor` FROM `@tftpboot_file` WHERE `vendor` IN ({r0}) AND (`dial_keys_json` IS NULL OR `dial_keys_json` = \'\') LIMIT #',
			$this->vendors_in_sql($vendors),
			intval($limit)
		));

		$n = 0;
		foreach($todo as $r)
		{
			$path = $this->resolve_path($r['filename']);
			if(!$path)
			{
				continue;
			}

			$content = file_get_contents($path);
			$parsed = $this->parse_content($r['vendor'], $content);
			$dial_keys_json = json_encode($this->dial_keys_compact($parsed), JSON_UNESCAPED_UNICODE);
			$this->core->db->put(rpv(
				'UPDATE `@tftpboot_file` SET `dial_keys_json` = ! WHERE `filename` = ! LIMIT 1',
				$dial_keys_json,
				$r['filename']
			));
			$n++;
		}

		return $n;
	}

	private function aggregate_unique_dial_keys($rows)
	{
		$uniq = array();
		foreach($rows as $r)
		{
			$keys = array();
			if(isset($r['dial_keys_json']) && $r['dial_keys_json'] !== '')
			{
				$keys = json_decode($r['dial_keys_json'], TRUE);
			}

			if(!is_array($keys))
			{
				continue;
			}

			$file_phone = $this->normalize_dial_number(isset($r['phone']) ? $r['phone'] : '');

			foreach($keys as $k)
			{
				$num = $this->normalize_dial_number(isset($k['number']) ? $k['number'] : '');
				if($num === '')
				{
					continue;
				}

				if($file_phone !== '' && $num === $file_phone)
				{
					continue;
				}

				$title = $this->normalize_dial_title(isset($k['title']) ? $k['title'] : '');
				$display_num = trim($k['number']);
				$display_title = isset($k['title']) ? $k['title'] : '';
				$id = $num."\0".$title;
				if(!isset($uniq[$id]))
				{
					$uniq[$id] = array(
						'number' => $display_num,
						'title' => $display_title,
						'old_number' => $display_num,
						'old_title' => $display_title,
						'count' => 0,
						'locations' => array(),
					);
				}

				$uniq[$id]['count']++;
				$loc = array('file' => $r['filename']);
				if(isset($k['line']) && intval($k['line']) > 0)
				{
					$loc['line'] = intval($k['line']);
				}
				else
				{
					$loc['line'] = 0;
				}

				$uniq[$id]['locations'][] = $loc;
			}
		}

		return $uniq;
	}

	public function get_tree()
	{
		$this->scan(FALSE);
		$catalog = $this->get_catalog();
		$enabled = $this->get_enabled_vendors('editor');
		$tree = array();

		foreach($catalog['vendors'] as $v)
		{
			if(!in_array($v['id'], $enabled, TRUE) && $v['id'] !== 'unknown')
			{
				continue;
			}

			$vnode = array('id' => $v['id'], 'title' => $v['title'], 'models' => array());
			foreach($v['models'] as $m)
			{
				$files = array();
				$rows = array();
				if($this->core->db->select_assoc_ex($rows, rpv(
					'SELECT `filename`, `phone`, `mac` FROM `@tftpboot_file` WHERE `vendor` = ! AND `model` = ! ORDER BY `phone`, `filename`',
					$v['id'],
					$m['id']
				)))
				{
					foreach($rows as $r)
					{
						$files[] = array(
							'filename' => $r['filename'],
							'label' => tftpboot_display_label($r['phone'], $r['mac']),
							'phone' => $r['phone'],
							'mac' => $r['mac'],
						);
					}
				}

				$vnode['models'][] = array(
					'id' => $m['id'],
					'title' => $m['title'],
					'dss_slots' => isset($m['dss_slots']) ? $m['dss_slots'] : 16,
					'files' => $files,
				);
			}

			$tree[] = $vnode;
		}

		return $tree;
	}

	public function get_config_for_editor($filename, $policy)
	{
		$path = $this->resolve_path($filename);
		if(!$path)
		{
			return NULL;
		}

		$content = file_get_contents($path);
		$vendor = $this->detect_vendor(basename($filename), $content);
		$row = array();
		if($this->core->db->select_assoc_ex($row, rpv('SELECT `vendor`, `model` FROM `@tftpboot_file` WHERE `filename` = ! LIMIT 1', $filename)))
		{
			$vendor = $row[0]['vendor'];
		}

		$parsed = $this->parse_content($vendor, $content);
		$mac = $this->mac_from_filename(basename($filename));

		$out = array(
			'filename' => $filename,
			'vendor' => $vendor,
			'mac' => $mac,
			'label' => tftpboot_display_label($parsed['phone'], $mac),
			'phone' => $parsed['phone'],
			'displayName' => isset($parsed['displayName']) ? $parsed['displayName'] : '',
			'speedDialKeys' => isset($parsed['speedDialKeys']) ? $parsed['speedDialKeys'] : array(),
			'policy' => $policy,
		);

		if($policy['mode'] === 'full' || $policy['mode'] === 'custom')
		{
			if(in_array('sip', $policy['sections'], TRUE) || in_array('all', $policy['sections'], TRUE))
			{
				$out['sip'] = isset($parsed['sip']) ? $parsed['sip'] : array();
				if($policy['mode'] === 'buttons_only')
				{
					unset($out['sip']);
				}
			}
		}

		if($policy['mode'] === 'buttons_only')
		{
			unset($out['sip']);
		}

		return $out;
	}

	public function backup_file($path)
	{
		$bak_dir = tftpboot_backup_dir();
		if(!is_dir($bak_dir))
		{
			@mkdir($bak_dir, 0755, TRUE);
		}

		$name = basename($path).'.'.date('Ymd_His').'.bak';
		@copy($path, $bak_dir.$name);
	}

	public function save_config($filename, $post, $policy)
	{
		$path = $this->resolve_path($filename);
		if(!$path)
		{
			return array('code' => 1, 'message' => 'Invalid file');
		}

		$content = file_get_contents($path);
		$vendor = $this->detect_vendor(basename($filename), $content);
		$parsed = $this->parse_content($vendor, $content);

		$this->backup_file($path);

		$new_content = $content;
		$mode = $policy['mode'];

		if(isset($post['speedDialKeys']) && is_array($post['speedDialKeys']))
		{
			if($vendor === 'fanvil')
			{
				$new_content = $this->fanvil->apply_speed_dials($parsed['lines'], $parsed['keys_raw'], $post['speedDialKeys'], $parsed['dss_index']);
			}
			elseif($vendor === 'cisco')
			{
				$new_content = $this->cisco->apply_speed_dials($content, $post['speedDialKeys']);
			}
			elseif($vendor === 'yealink')
			{
				$new_content = $this->yealink->apply_linekey($content, $post['speedDialKeys']);
			}
		}

		if(($mode === 'full' || ($mode === 'custom' && (in_array('sip', $policy['sections'], TRUE) || in_array('all', $policy['sections'], TRUE))))
			&& isset($post['sip']) && is_array($post['sip']) && $vendor === 'fanvil')
		{
			$lines = preg_split('/\r\n|\r|\n/', $new_content);
			$new_content = $this->fanvil->apply_sip_fields($lines, $post['sip']);
		}

		if(isset($post['slot_order']) && is_array($post['slot_order']) && $vendor === 'fanvil')
		{
			$reparsed = $this->fanvil->parse($new_content);
			$new_content = $this->fanvil->remap_slots($reparsed, $post['slot_order']);
		}

		if(isset($post['displayName']) && ($mode === 'full' || in_array('sip', $policy['sections'], TRUE)))
		{
			if($vendor === 'fanvil')
			{
				$lines = preg_split('/\r\n|\r|\n/', $new_content);
				$new_content = $this->fanvil->apply_sip_fields($lines, array('SIP1 Display Name' => $post['displayName']));
			}
		}

		if(!file_put_contents($path, $new_content))
		{
			return array('code' => 1, 'message' => 'Write failed');
		}

		$this->index_disk_file($filename);
		log_db('tftpboot save', $filename, 0);

		return array('code' => 0, 'message' => LL('Save'));
	}

	private function sql_in_strings($values)
	{
		$parts = array();
		foreach($values as $v)
		{
			$parts[] = '\''.sql_escape((string)$v).'\'';
		}

		return implode(',', $parts);
	}

	private function vendors_in_sql($vendors)
	{
		$parts = array();
		foreach($vendors as $v)
		{
			$parts[] = '\''.sql_escape((string)$v).'\'';
		}

		return implode(',', $parts);
	}

	public function normalize_dial_number($number)
	{
		return preg_replace('/\D+/', '', (string)$number);
	}

	public function normalize_dial_title($title)
	{
		$title = trim((string)$title);

		return preg_replace('/\s+/u', ' ', $title);
	}

	public function dial_entry_match($key, $old_number, $old_title)
	{
		if($this->normalize_dial_number($key['number']) !== $this->normalize_dial_number($old_number))
		{
			return FALSE;
		}

		$label = isset($key['label']) ? $key['label'] : '';

		return $this->normalize_dial_title($label) === $this->normalize_dial_title($old_title);
	}

	public function list_unique_dial_keys($vendors, $query = '')
	{
		@set_time_limit(180);
		if(!count($vendors))
		{
			return array();
		}

		$this->ensure_dial_keys_column();
		$this->scan(FALSE);

		$rows = $this->fetch_tftpboot_vendor_rows($vendors);
		$missing = 0;
		foreach($rows as $row)
		{
			if(!isset($row['dial_keys_json']) || $row['dial_keys_json'] === '' || $row['dial_keys_json'] === null)
			{
				$missing++;
			}
		}

		if(count($rows) > 0 && $missing >= count($rows))
		{
			$this->scan(TRUE);
			$rows = $this->fetch_tftpboot_vendor_rows($vendors);
		}
		else
		{
			for($i = 0; $i < 30; $i++)
			{
				$n = $this->backfill_dial_keys_json($vendors, 80);
				if($n <= 0)
				{
					break;
				}
			}

			$rows = $this->fetch_tftpboot_vendor_rows($vendors);
		}

		$query = trim($query);
		$uniq = $this->aggregate_unique_dial_keys($rows);

		$result = array();
		foreach($uniq as $row)
		{
			if($query !== '')
			{
				$hay = $row['number'].' '.$row['title'];
				if(stripos($hay, $query) === FALSE)
				{
					continue;
				}
			}

			$result[] = $row;
		}

		usort($result, function($a, $b)
		{
			$c = strnatcasecmp($a['title'], $b['title']);
			if($c !== 0)
			{
				return $c;
			}

			return strnatcasecmp($a['number'], $b['number']);
		});

		return $result;
	}

	public function search_keys($query, $vendors)
	{
		return $this->list_unique_dial_keys($vendors, $query);
	}

	public function bulk_save_keys($items, $vendors)
	{
		$this->ensure_dial_keys_column();
		$rows = array();
		if(!count($vendors) || !count($items))
		{
			return 0;
		}

		$this->core->db->select_assoc_ex($rows, rpv(
			'SELECT `filename`, `vendor` FROM `@tftpboot_file` WHERE `vendor` IN ({r0}) ORDER BY `filename`',
			$this->vendors_in_sql($vendors)
		));

		$files_ok = 0;
		$keys_ok = 0;
		$touched = array();

		foreach($rows as $r)
		{
			if(!in_array($r['vendor'], $vendors, TRUE))
			{
				continue;
			}

			$path = $this->resolve_path($r['filename']);
			if(!$path)
			{
				continue;
			}

			$content = file_get_contents($path);
			$vendor = $r['vendor'];
			$parsed = $this->parse_content($vendor, $content);
			$dirty = FALSE;

			foreach($items as $item)
			{
				$old_number = isset($item['old_number']) ? $item['old_number'] : (isset($item['number']) ? $item['number'] : '');
				$old_title = isset($item['old_title']) ? $item['old_title'] : (isset($item['title']) ? $item['title'] : '');
				$new_number = isset($item['number']) ? trim($item['number']) : '';
				$new_title = isset($item['title']) ? trim($item['title']) : '';

				if($this->normalize_dial_number($old_number) === '')
				{
					continue;
				}

				if($new_number === $old_number && $this->normalize_dial_title($new_title) === $this->normalize_dial_title($old_title))
				{
					continue;
				}

				foreach($parsed['speedDialKeys'] as &$k)
				{
					if(!$this->dial_entry_match($k, $old_number, $old_title))
					{
						continue;
					}

					if($new_number !== '')
					{
						$k['number'] = $new_number;
					}
					if(isset($item['title']))
					{
						$k['label'] = $new_title;
					}

					if($vendor === 'fanvil')
					{
						$old_val = isset($k['value']) ? $k['value'] : '';
						$num = $new_number !== '' ? $new_number : $k['number'];
						if($old_val !== '' && preg_match('/^(\d+)(.*)$/', $old_val, $vm))
						{
							$k['value'] = $num.$vm[2];
						}
						elseif($num !== '')
						{
							$k['value'] = $num.'@1/f';
						}
					}

					$dirty = TRUE;
					$keys_ok++;
				}
				unset($k);
			}

			if(!$dirty)
			{
				continue;
			}

			$this->backup_file($path);

			if($vendor === 'fanvil')
			{
				$new = $this->fanvil->apply_speed_dials($parsed['lines'], $parsed['keys_raw'], $parsed['speedDialKeys']);
			}
			elseif($vendor === 'cisco')
			{
				$new = $this->cisco->apply_speed_dials($content, $parsed['speedDialKeys']);
			}
			elseif($vendor === 'yealink')
			{
				$new = $this->yealink->apply_linekey($content, $parsed['speedDialKeys']);
			}
			else
			{
				continue;
			}

			if(file_put_contents($path, $new))
			{
				$files_ok++;
				$touched[] = $r['filename'];
			}
		}

		$this->reindex_files($touched);

		return $keys_ok > 0 ? $keys_ok : $files_ok;
	}

	public function bulk_delete_keys($items, $vendors)
	{
		$this->ensure_dial_keys_column();
		$rows = array();
		if(!count($vendors) || !count($items))
		{
			return 0;
		}

		$this->core->db->select_assoc_ex($rows, rpv(
			'SELECT `filename`, `vendor` FROM `@tftpboot_file` WHERE `vendor` IN ({r0}) ORDER BY `filename`',
			$this->vendors_in_sql($vendors)
		));

		$files_ok = 0;
		$keys_ok = 0;
		$touched = array();

		foreach($rows as $r)
		{
			if(!in_array($r['vendor'], $vendors, TRUE))
			{
				continue;
			}

			$path = $this->resolve_path($r['filename']);
			if(!$path)
			{
				continue;
			}

			$content = file_get_contents($path);
			$vendor = $r['vendor'];
			$parsed = $this->parse_content($vendor, $content);
			$to_clear = array();

			foreach($items as $item)
			{
				$old_number = isset($item['old_number']) ? $item['old_number'] : '';
				$old_title = isset($item['old_title']) ? $item['old_title'] : '';

				if($this->normalize_dial_number($old_number) === '')
				{
					continue;
				}

				foreach($parsed['speedDialKeys'] as $k)
				{
					if(!$this->dial_entry_match($k, $old_number, $old_title))
					{
						continue;
					}

					if(isset($k['key_id']))
					{
						$to_clear[$k['key_id']] = $k['key_id'];
					}
				}
			}

			$to_clear = array_values($to_clear);
			if(!count($to_clear))
			{
				continue;
			}

			$this->backup_file($path);

			if($vendor === 'fanvil')
			{
				$this->fanvil->clear_dss_keys($parsed['lines'], $parsed['keys_raw'], $to_clear);
				$new = implode("\n", $parsed['lines']);
			}
			else
			{
				continue;
			}

			if(file_put_contents($path, $new))
			{
				$files_ok++;
				$keys_ok += count($to_clear);
				$touched[] = $r['filename'];
			}
		}

		$this->reindex_files($touched);

		return $keys_ok;
	}

	public function directory_rows()
	{
		$rows = array();
		$contacts = array();
		if($this->core->db->select_assoc_ex($contacts, rpv(
			'SELECT `phone_internal`, `last_name`, `first_name`, `middle_name` FROM `@contacts` '.
			'WHERE (`flags` & 1) = 1 AND `phone_internal` <> \'\' ORDER BY `phone_internal` LIMIT 20000'
		)))
		{
			foreach($contacts as $c)
			{
				$name = tftpboot_format_initials($c['last_name'], $c['first_name'], $c['middle_name']);
				foreach(tftpboot_extract_phone_numbers($c['phone_internal']) as $num)
				{
					$rows[] = array('number' => $num, 'name' => $name);
				}
			}
		}

		usort($rows, function($a, $b) {
			$na = strlen($a['number']);
			$nb = strlen($b['number']);
			if($na !== $nb)
			{
				return $na - $nb;
			}

			return strcmp($a['number'], $b['number']);
		});

		return $rows;
	}

	public function sync_name_map()
	{
		return TftpSyncSources::fetch_map($this->core);
	}

	private function extract_surname_from_title($title)
	{
		$title = trim((string)$title);
		if($title === '')
		{
			return '';
		}
		if(preg_match('/^([\p{L}\-]+)/u', $title, $m))
		{
			return mb_strtolower($m[1], 'UTF-8');
		}

		return '';
	}

	public function build_sync_phonebook_index($name_map)
	{
		$index = array(
			'tails_7' => array(),
			'by_surname' => array(),
		);

		foreach($name_map as $num => $name)
		{
			$num = (string)$num;
			if(!preg_match('/^\d+$/', $num) || strlen($num) < 2)
			{
				continue;
			}

			if($num[0] === '7')
			{
				$tail = substr($num, 1);
				if(!isset($index['tails_7'][$tail]))
				{
					$index['tails_7'][$tail] = array();
				}
				$index['tails_7'][$tail][] = $num;
			}
		}

		$contacts = array();
		if($this->core->db->select_assoc_ex($contacts, rpv(
			'SELECT `phone_internal`, `last_name`, `first_name`, `middle_name` FROM `@contacts` '.
			'WHERE (`flags` & 1) = 1 AND `phone_internal` <> \'\''
		)))
		{
			foreach($contacts as $c)
			{
				$fmt = tftpboot_format_initials($c['last_name'], $c['first_name'], $c['middle_name']);
				$surnames = array();
				$ln = trim((string)$c['last_name']);
				if($ln !== '')
				{
					$surnames[mb_strtolower($ln, 'UTF-8')] = TRUE;
				}
				elseif(trim((string)$c['first_name']) !== '')
				{
					$parts = preg_split('/\s+/u', trim($c['first_name']), -1, PREG_SPLIT_NO_EMPTY);
					if(count($parts))
					{
						$surnames[mb_strtolower($parts[0], 'UTF-8')] = TRUE;
					}
				}

				$nums = tftpboot_extract_phone_numbers($c['phone_internal']);
				foreach(array_keys($surnames) as $sn)
				{
					if($sn === '')
					{
						continue;
					}
					if(!isset($index['by_surname'][$sn]))
					{
						$index['by_surname'][$sn] = array();
					}
					$index['by_surname'][$sn][] = array('numbers' => $nums, 'name' => $fmt);
				}
			}
		}

		return $index;
	}

	private function resolve_sync_title_for_dial($num, $title, $name_map, $index)
	{
		if(isset($name_map[$num]) && trim((string)$name_map[$num]) !== '')
		{
			return array('title' => (string)$name_map[$num], 'source' => 'phonebook');
		}

		if(strlen($num) < 4 || $num[0] !== '6')
		{
			return array('title' => '', 'source' => '');
		}

		$tail = substr($num, 1);
		if($tail === '')
		{
			return array('title' => '', 'source' => '');
		}

		if(!empty($index['tails_7'][$tail]))
		{
			$book_num = $index['tails_7'][$tail][0];

			return array(
				'title' => (string)$name_map[$book_num],
				'source' => 'tail7',
			);
		}

		$sn = $this->extract_surname_from_title($title);
		if($sn !== '' && !empty($index['by_surname'][$sn]))
		{
			foreach($index['by_surname'][$sn] as $c)
			{
				foreach($c['numbers'] as $pn)
				{
					$dig = $this->normalize_dial_number($pn);
					if($dig !== '' && strlen($dig) > 1 && substr($dig, 1) === $tail)
					{
						return array('title' => $c['name'], 'source' => 'surname');
					}
				}
			}
		}

		return array('title' => '', 'source' => '');
	}

	private function should_sync_delete_six_dial($num, $name_map, $index, $resolved_title)
	{
		if($resolved_title !== '')
		{
			return FALSE;
		}
		if(strlen($num) < 4 || $num[0] !== '6')
		{
			return FALSE;
		}
		if(isset($name_map[$num]))
		{
			return FALSE;
		}

		$tail = substr($num, 1);
		if($tail !== '' && !empty($index['tails_7'][$tail]))
		{
			return FALSE;
		}

		foreach($name_map as $book_num => $nm)
		{
			$book_num = (string)$book_num;
			if(!preg_match('/^\d+$/', $book_num) || strlen($book_num) < 2)
			{
				continue;
			}
			if($book_num[0] === '6' && substr($book_num, 1) === $tail)
			{
				return FALSE;
			}
		}

		return TRUE;
	}

	private function sync_canonical_title_for_number($num, $rows, $name_map)
	{
		if(isset($name_map[$num]) && trim((string)$name_map[$num]) !== '')
		{
			return (string)$name_map[$num];
		}

		if(count($rows) < 2)
		{
			return '';
		}

		$variants = array();
		foreach($rows as $row)
		{
			$norm = $this->normalize_dial_title($row['title']);
			if($norm === '')
			{
				continue;
			}

			if(!isset($variants[$norm]))
			{
				$variants[$norm] = array(
					'title' => $row['title'],
					'count' => 0,
				);
			}

			$variants[$norm]['count'] += isset($row['count']) ? intval($row['count']) : 0;
		}

		if(count($variants) < 2)
		{
			return '';
		}

		$best = '';
		$best_cnt = -1;
		foreach($variants as $v)
		{
			$c = $v['count'];
			$t = $v['title'];
			if($c > $best_cnt
				|| ($c === $best_cnt && mb_strlen($this->normalize_dial_title($t), 'UTF-8') > mb_strlen($this->normalize_dial_title($best), 'UTF-8')))
			{
				$best = $t;
				$best_cnt = $c;
			}
		}

		return $best;
	}

	public function build_sync_diff($name_map, $vendors = array())
	{
		if(!count($vendors))
		{
			$vendors = $this->get_enabled_vendors('bulk');
			if(!count($vendors))
			{
				$vendors = array('fanvil', 'cisco', 'yealink', 'grandstream', 'eltex');
			}
		}

		$index = $this->build_sync_phonebook_index($name_map);
		$keys = $this->list_unique_dial_keys($vendors, '');
		$by_num = array();
		$diff = array();

		foreach($keys as $row)
		{
			$num = $this->normalize_dial_number($row['number']);
			if($num === '')
			{
				continue;
			}

			$resolved = $this->resolve_sync_title_for_dial($num, $row['title'], $name_map, $index);
			if($resolved['title'] !== '')
			{
				if($this->normalize_dial_title($row['title']) !== $this->normalize_dial_title($resolved['title']))
				{
					$diff[] = array(
						'action' => 'update',
						'number' => $row['number'],
						'title' => $resolved['title'],
						'old_number' => $row['old_number'],
						'old_title' => $row['old_title'],
						'count' => isset($row['count']) ? intval($row['count']) : 0,
						'source' => $resolved['source'],
					);
				}

				continue;
			}

			if($this->should_sync_delete_six_dial($num, $name_map, $index, ''))
			{
				$diff[] = array(
					'action' => 'delete',
					'number' => $row['number'],
					'title' => '',
					'old_number' => $row['old_number'],
					'old_title' => $row['old_title'],
					'count' => isset($row['count']) ? intval($row['count']) : 0,
					'source' => 'orphan6',
				);
				continue;
			}

			if(!isset($by_num[$num]))
			{
				$by_num[$num] = array();
			}

			$by_num[$num][] = $row;
		}

		foreach($by_num as $num => $rows)
		{
			$expected = $this->sync_canonical_title_for_number($num, $rows, $name_map);
			if($expected === '')
			{
				continue;
			}

			$exp_norm = $this->normalize_dial_title($expected);
			foreach($rows as $row)
			{
				if($this->normalize_dial_title($row['title']) === $exp_norm)
				{
					continue;
				}

				$diff[] = array(
					'action' => 'update',
					'number' => $row['number'],
					'title' => $expected,
					'old_number' => $row['old_number'],
					'old_title' => $row['old_title'],
					'count' => isset($row['count']) ? intval($row['count']) : 0,
					'source' => isset($name_map[$num]) ? 'phonebook' : 'consensus',
				);
			}
		}

		usort($diff, function($a, $b) {
			return strnatcasecmp($a['number'], $b['number']);
		});

		return $diff;
	}

	public function apply_sync_diff($items, $vendors)
	{
		if(!is_array($vendors))
		{
			$vendors = array();
		}
		if(!count($vendors))
		{
			$vendors = $this->get_enabled_vendors('bulk');
		}

		$updates = array();
		$deletes = array();
		foreach($items as $item)
		{
			if(!is_array($item))
			{
				continue;
			}

			if(!empty($item['action']) && $item['action'] === 'delete')
			{
				$deletes[] = array(
					'old_number' => isset($item['old_number']) ? $item['old_number'] : '',
					'old_title' => isset($item['old_title']) ? $item['old_title'] : '',
				);
				continue;
			}

			$updates[] = $item;
		}

		$n = 0;
		if(count($updates))
		{
			$n += $this->bulk_save_keys($updates, $vendors);
		}
		if(count($deletes))
		{
			$n += $this->bulk_delete_keys($deletes, $vendors);
		}

		return $n;
	}

	public function list_unknown_files()
	{
		$rows = array();
		if($this->core->db->select_assoc_ex($rows, rpv("SELECT `filename`, `vendor`, `model`, `phone`, `mac` FROM `@tftpboot_file` WHERE `vendor` = 'unknown' ORDER BY `filename`")))
		{
			return $rows;
		}

		return array();
	}

	public function save_override($filename, $vendor, $model)
	{
		$this->core->db->put(rpv(
			"INSERT INTO `@tftpboot_override` (`filename`, `mac`, `vendor`, `model`) VALUES (!, !, !, !) ".
			"ON DUPLICATE KEY UPDATE `vendor`=VALUES(`vendor`), `model`=VALUES(`model`)",
			$filename,
			$this->mac_from_filename(basename($filename)),
			$vendor,
			$model
		));
		$this->scan(TRUE);

		return TRUE;
	}

	public function get_policies()
	{
		$rows = array();
		if($this->core->db->select_assoc_ex($rows, rpv('SELECT `id`, `sid`, `dn`, `mode`, `allowed_sections_json` FROM `@tftpboot_group_policy` ORDER BY `dn`')))
		{
			return $rows;
		}

		return array();
	}

	public function save_policy($sid, $dn, $mode, $sections)
	{
		$json = json_encode(array_values($sections), JSON_UNESCAPED_UNICODE);
		return $this->core->db->put(rpv(
			"INSERT INTO `@tftpboot_group_policy` (`sid`, `dn`, `mode`, `allowed_sections_json`) VALUES (!, !, !, !) ".
			"ON DUPLICATE KEY UPDATE `dn`=VALUES(`dn`), `mode`=VALUES(`mode`), `allowed_sections_json`=VALUES(`allowed_sections_json`)",
			$sid,
			$dn,
			$mode,
			$json
		));
	}
}
