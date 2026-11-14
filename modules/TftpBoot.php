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

	public function __construct(&$core)
	{
		$this->core = $core;
		$this->fanvil = new TftpFanvilParser();
		$this->cisco = new TftpCiscoXmlParser();
		$this->yealink = new TftpYealinkParser();
		$this->grandstream = new TftpGrandstreamParser();
		$this->eltex = new TftpEltexParser();
	}

	public function get_catalog()
	{
		$json = $this->core->Config->get_global('tftpboot_catalog_json', '');
		$data = json_decode($json, TRUE);
		if(!is_array($data) || !isset($data['vendors']))
		{
			$path = ROOT_DIR.'config/tftpboot_catalog.json';
			if(file_exists($path))
			{
				$data = json_decode(file_get_contents($path), TRUE);
			}
		}

		if(!is_array($data) || !isset($data['vendors']))
		{
			$data = array('vendors' => array());
		}

		return $data;
	}

	public function save_catalog($data)
	{
		$json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
		$this->core->Config->set_global('tftpboot_catalog_json', $json);

		return TRUE;
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

	public function detect_vendor($filename, $content)
	{
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
				if($m['id'] === 'unknown')
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
				if($m['id'] === 'unknown')
				{
					return 'unknown';
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

	public function scan($force = FALSE)
	{
		if(!$force && !$this->should_scan())
		{
			return TRUE;
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

			$path = $dir.$name;
			if(!is_file($path))
			{
				continue;
			}

			if(!preg_match('/\.(cfg|xml)$/i', $name))
			{
				continue;
			}

			if(preg_match('/^(F0V|f0v)/i', $name))
			{
				continue;
			}

			if(!preg_match('/^[0-9a-f]{12}\.cfg$/i', $name)
				&& !preg_match('/^SEP[0-9A-F]{12}\.cnf\.xml$/i', $name)
				&& !preg_match('/^cfg[0-9A-F]{12}\.xml$/i', $name)
				&& !preg_match('/^([0-9A-F]{2}\.){5}[0-9A-F]{2}\.cfg$/i', $name)
			)
			{
				continue;
			}

			$filename = $name;
			$content = @file_get_contents($path);
			if($content === FALSE)
			{
				continue;
			}

			$override = $this->get_override($filename);
			$vendor = $override ? $override['vendor'] : $this->detect_vendor($filename, $content);
			$parsed = $this->parse_content($vendor, $content);
			$hint = isset($parsed['model_hint']) ? $parsed['model_hint'] : '';
			$model = $override ? $override['model'] : $this->match_model($vendor, $hint, $catalog);
			$mac = $this->mac_from_filename(basename($filename));
			$phone = isset($parsed['phone']) ? $parsed['phone'] : '';
			$parser = $this->parser_for($vendor);
			$dss = $parser ? $parser->build_dss_search($parsed) : '';
			$mtime = filemtime($path);

			$this->core->db->put(rpv(
				"INSERT INTO `@tftpboot_file` (`filename`, `mac`, `vendor`, `model`, `phone`, `dss_search`, `mtime`, `auto_detected`) ".
				"VALUES (!, !, !, !, !, !, #, #) ON DUPLICATE KEY UPDATE `mac`=VALUES(`mac`), `vendor`=VALUES(`vendor`), ".
				"`model`=VALUES(`model`), `phone`=VALUES(`phone`), `dss_search`=VALUES(`dss_search`), `mtime`=VALUES(`mtime`), ".
				"`auto_detected`=VALUES(`auto_detected`)",
				$filename,
				$mac,
				$vendor,
				$model,
				$phone,
				$dss,
				$mtime,
				$override ? 0 : 1
			));

		}

		return TRUE;
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

		$this->scan(TRUE);
		log_db('tftpboot save', $filename, 0);

		return array('code' => 0, 'message' => LL('Save'));
	}

	public function search_keys($query, $vendors)
	{
		$this->scan(FALSE);
		$query = trim($query);
		if($query === '')
		{
			return array();
		}

		$like = '%'.$query.'%';
		$rows = array();
		if(count($vendors))
		{
			$this->core->db->select_assoc_ex($rows, rpv(
				'SELECT `filename`, `phone`, `mac`, `vendor`, `model`, `dss_search` FROM `@tftpboot_file` WHERE `dss_search` LIKE ! AND `vendor` IN ({r0}) ORDER BY `phone`',
				$like,
				$vendors
			));
		}

		$result = array();
		foreach($rows as $r)
		{
			$path = $this->resolve_path($r['filename']);
			if(!$path)
			{
				continue;
			}

			$content = file_get_contents($path);
			$parsed = $this->parse_content($r['vendor'], $content);
			foreach($parsed['speedDialKeys'] as $k)
			{
				$hay = $k['number'].' '.$k['label'];
				if(stripos($hay, $query) !== FALSE)
				{
					$result[] = array(
						'filename' => $r['filename'],
						'label' => tftpboot_display_label($r['phone'], $r['mac']),
						'slot' => $k['slot'],
						'number' => $k['number'],
						'title' => $k['label'],
						'vendor' => $r['vendor'],
					);
				}
			}
		}

		return $result;
	}

	public function bulk_save_keys($items, $vendors)
	{
		$ok = 0;
		foreach($items as $item)
		{
			$fn = isset($item['filename']) ? $item['filename'] : '';
			if(!$fn || !in_array(isset($item['vendor']) ? $item['vendor'] : '', $vendors, TRUE))
			{
				continue;
			}

			$path = $this->resolve_path($fn);
			if(!$path)
			{
				continue;
			}

			$content = file_get_contents($path);
			$vendor = $item['vendor'];
			$parsed = $this->parse_content($vendor, $content);
			$this->backup_file($path);

			foreach($parsed['speedDialKeys'] as &$k)
			{
				if(intval($k['slot']) === intval($item['slot']))
				{
					if(isset($item['number']))
					{
						$k['number'] = $item['number'];
					}
					if(isset($item['title']))
					{
						$k['label'] = $item['title'];
					}
				}
			}
			unset($k);

			if($vendor === 'fanvil')
			{
				foreach($parsed['speedDialKeys'] as &$k)
				{
					if(isset($item['number']))
					{
						$k['value'] = $item['number'].'@1/f';
					}
				}
				unset($k);
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
				$ok++;
			}
		}

		$this->scan(TRUE);

		return $ok;
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
				$rows[] = array(
					'number' => $c['phone_internal'],
					'name' => tftpboot_format_initials($c['last_name'], $c['first_name'], $c['middle_name']),
				);
			}
		}

		return $rows;
	}

	public function sync_name_map()
	{
		return TftpSyncSources::fetch_map($this->core);
	}

	public function build_sync_diff($name_map)
	{
		$this->scan(FALSE);
		$diff = array();
		$files = array();
		if(!$this->core->db->select_assoc_ex($files, rpv('SELECT `filename`, `phone`, `mac`, `vendor` FROM `@tftpboot_file` WHERE `phone` <> \'\'')))
		{
			return $diff;
		}

		$fields = explode(',', $this->core->Config->get_global('tftpboot_sync_fields', 'dss_title,display_name'));

		foreach($files as $f)
		{
			$phone = preg_replace('/[^0-9]/', '', $f['phone']);
			$expected = '';
			foreach($name_map as $num => $nm)
			{
				if($num === $phone || $num === $f['phone'])
				{
					$expected = $nm;
					break;
				}
			}

			if($expected === '')
			{
				continue;
			}

			$path = $this->resolve_path($f['filename']);
			if(!$path)
			{
				continue;
			}

			$parsed = $this->parse_content($f['vendor'], file_get_contents($path));
			$changes = array();

			if(in_array('display_name', $fields, TRUE))
			{
				$cur = isset($parsed['displayName']) ? $parsed['displayName'] : '';
				if($cur !== $expected)
				{
					$changes[] = array('field' => 'display_name', 'old' => $cur, 'new' => $expected);
				}
			}

			if(in_array('dss_title', $fields, TRUE))
			{
				foreach($parsed['speedDialKeys'] as $k)
				{
					if($k['number'] === $phone || preg_replace('/[^0-9]/', '', $k['number']) === $phone)
					{
						if($k['label'] !== $expected)
						{
							$changes[] = array('field' => 'dss_title', 'slot' => $k['slot'], 'old' => $k['label'], 'new' => $expected);
						}
					}
				}
			}

			if(count($changes))
			{
				$diff[] = array(
					'filename' => $f['filename'],
					'label' => tftpboot_display_label($f['phone'], $f['mac']),
					'phone' => $f['phone'],
					'changes' => $changes,
				);
			}
		}

		return $diff;
	}

	public function apply_sync_diff($items, $policy)
	{
		$applied = 0;
		foreach($items as $item)
		{
			$fn = $item['filename'];
			$path = $this->resolve_path($fn);
			if(!$path)
			{
				continue;
			}

			$content = file_get_contents($path);
			$vendor = $this->detect_vendor(basename($fn), $content);
			$parsed = $this->parse_content($vendor, $content);
			$this->backup_file($path);

			$save = array('speedDialKeys' => $parsed['speedDialKeys'], 'sip' => array());
			foreach($item['changes'] as $ch)
			{
				if($ch['field'] === 'display_name')
				{
					$save['displayName'] = $ch['new'];
					if($vendor === 'fanvil')
					{
						$save['sip']['SIP1 Display Name'] = $ch['new'];
					}
				}
				if($ch['field'] === 'dss_title' && isset($ch['slot']))
				{
					foreach($save['speedDialKeys'] as &$k)
					{
						if(intval($k['slot']) === intval($ch['slot']))
						{
							$k['label'] = $ch['new'];
						}
					}
					unset($k);
				}
			}

			$res = $this->save_config($fn, $save, $policy);
			if($res['code'] === 0)
			{
				$applied++;
			}
		}

		return $applied;
	}

	public function list_unknown_files()
	{
		$rows = array();
		if($this->core->db->select_assoc_ex($rows, rpv("SELECT `filename`, `vendor`, `model`, `phone`, `mac` FROM `@tftpboot_file` WHERE `vendor` = 'unknown' OR `model` = 'unknown' ORDER BY `filename`")))
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
