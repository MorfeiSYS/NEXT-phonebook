<?php

class TftpFanvilParser
{
	private function section_id($name, $dss_index = 0)
	{
		$id = preg_replace('/\s+/', ' ', strtolower(trim($name)));

		return 'm'.intval($dss_index).'/'.$id;
	}

	private function dial_suffix_from_value($val)
	{
		$val = trim((string)$val);
		if($val !== '' && preg_match('/^\d+(.*)$/', $val, $m))
		{
			return $m[1];
		}

		return '';
	}

	private function section_is_dial_editable($section_title)
	{
		$t = strtolower(trim((string)$section_title));
		if($t === '')
		{
			return FALSE;
		}

		if(strpos($t, 'softdss') !== FALSE)
		{
			return TRUE;
		}

		if(strpos($t, 'sidekey') !== FALSE)
		{
			return TRUE;
		}

		if(preg_match('/dsskey\s*config/', $t))
		{
			return TRUE;
		}

		return FALSE;
	}

	private function key_id($section, $slot)
	{
		return $section.'#'.$slot;
	}

	private function normalize_type2_line_value($raw)
	{
		$v = strtoupper(trim((string)$raw));
		if($v === 'AUTO')
		{
			return 'AUTO';
		}

		if(preg_match('/^SIP\d+$/', $v))
		{
			return $v;
		}

		return NULL;
	}

	private function normalize_type3_line_value($raw)
	{
		$v = strtoupper(trim((string)$raw));
		static $codes = array('F_SMS', 'F_MWI', 'F_RECORD');
		if(in_array($v, $codes, TRUE))
		{
			return $v;
		}

		return NULL;
	}

	private function default_title_type3($code)
	{
		$code = strtoupper(trim((string)$code));
		static $map = array(
			'F_SMS' => 'СМС',
			'F_MWI' => 'Почта',
			'F_RECORD' => 'Запись',
		);

		return isset($map[$code]) ? $map[$code] : '';
	}

	private function number_from_value($val)
	{
		$val = trim($val);
		if($val === '')
		{
			return '';
		}

		$t2 = $this->normalize_type2_line_value($val);
		if($t2 !== NULL)
		{
			return $t2;
		}

		$t3 = $this->normalize_type3_line_value($val);
		if($t3 !== NULL)
		{
			return $t3;
		}

		if(preg_match('/^(\d+)/', $val, $m))
		{
			return $m[1];
		}

		return $val;
	}

	private function is_type2_line_fkey($k)
	{
		$val = isset($k['value']) ? $k['value'] : '';
		$type = isset($k['type']) ? intval($k['type']) : 0;

		return $type === 2 && $this->normalize_type2_line_value($val) !== NULL;
	}

	private function is_type3_line_fkey($k)
	{
		$val = isset($k['value']) ? $k['value'] : '';
		$type = isset($k['type']) ? intval($k['type']) : 0;

		return $type === 3 && $this->normalize_type3_line_value($val) !== NULL;
	}

	private function is_special_line_fkey($k)
	{
		return $this->is_type2_line_fkey($k) || $this->is_type3_line_fkey($k);
	}

	private function set_line_colon_value($line, $value)
	{
		$pos = strpos($line, ':');
		if($pos === FALSE)
		{
			return $line;
		}

		return substr($line, 0, $pos + 1).$value;
	}

	private function set_fkey_field(&$lines, $slot, $field, $value, $line_index = NULL)
	{
		$apply = function($i) use (&$lines, $value)
		{
			if(isset($lines[$i]))
			{
				$lines[$i] = $this->set_line_colon_value($lines[$i], $value);
			}
		};

		if($line_index !== NULL)
		{
			$apply($line_index);

			return;
		}

		foreach($lines as $i => $line)
		{
			if(preg_match('/^Fkey'.$slot.'\s+'.preg_quote($field, '/').'\s*:/', $line))
			{
				$apply($i);
			}
		}
	}

	public function clear_dss_keys(&$lines, &$keys_raw, $key_ids)
	{
		foreach(array_unique($key_ids) as $kid)
		{
			if(!isset($keys_raw[$kid]))
			{
				continue;
			}

			$k = &$keys_raw[$kid];
			$slot = intval($k['slot']);
			$line_type = isset($k['line_type']) ? $k['line_type'] : NULL;
			$line_value = isset($k['line_value']) ? $k['line_value'] : NULL;
			$line_title = isset($k['line_title']) ? $k['line_title'] : NULL;

			$this->set_fkey_field($lines, $slot, 'Type', '0', $line_type);
			$this->set_fkey_field($lines, $slot, 'Value', '', $line_value);
			$this->set_fkey_field($lines, $slot, 'Title', '', $line_title);

			$k['type'] = 0;
			$k['value'] = '';
			$k['title'] = '';
		}
	}

	private function build_dial_value($number, $old_value)
	{
		$number = trim($number);
		$old_value = trim($old_value);
		if($number === '')
		{
			return $old_value;
		}

		if($old_value !== '' && preg_match('/^(\d+)(.*)$/', $old_value, $m))
		{
			return $number.$m[2];
		}

		return $number.'@1/f';
	}

	public function parse($content)
	{
		$lines = preg_split('/\r\n|\r|\n/', $content);
		$sip = array();
		$keys_raw = array();
		$net = array();
		$in_dss = FALSE;
		$section = '';
		$section_title = '';
		$dss_index = -1;

		foreach($lines as $li => $line)
		{
			if(preg_match('/^\s*Vendor Class ID\s+:\s*(.*)\s*$/i', $line, $vc))
			{
				$net['Vendor Class ID'] = trim($vc[1]);
			}

			if(stripos($line, '<DSSKEY CONFIG MODULE>') !== FALSE)
			{
				$in_dss = TRUE;
				$dss_index++;
				$section = '';
				$section_title = '';
				continue;
			}

			if($in_dss && preg_match('/^<[^>]+>\s*$/', $line) && stripos($line, 'DSSKEY') === FALSE)
			{
				$in_dss = FALSE;
				$section = '';
				$section_title = '';
			}

			if($in_dss && preg_match('/^--\s*(.+?)\s*--\s*:?\s*$/', $line, $sm))
			{
				$section_title = trim($sm[1]);
				$section = $this->section_id($section_title, $dss_index);
				continue;
			}

			if(!$in_dss || $section === '')
			{
				if(preg_match('/^(\S.*?)\s*:\s*(.*)$/', $line, $m))
				{
					$key = trim($m[1]);
					$val = $m[2];
					if(strpos($key, 'SIP1 ') === 0)
					{
						$sip[$key] = $val;
					}
				}
				continue;
			}

			$kid = NULL;
			if(preg_match('/^Fkey(\d+)\s+Type\s*:\s*(\d+)/', $line, $m))
			{
				$slot = intval($m[1]);
				$kid = $this->key_id($section, $slot);
				if(!isset($keys_raw[$kid]))
				{
					$keys_raw[$kid] = array(
						'key_id' => $kid,
						'section' => $section,
						'section_title' => $section_title,
						'slot' => $slot,
						'type' => intval($m[2]),
						'value' => '',
						'title' => '',
						'line_type' => $li,
					);
				}
				else
				{
					$keys_raw[$kid]['type'] = intval($m[2]);
					$keys_raw[$kid]['line_type'] = $li;
				}
				continue;
			}

			if(preg_match('/^Fkey(\d+)\s+Value\s*:\s*(.*)$/', $line, $m))
			{
				$slot = intval($m[1]);
				$kid = $this->key_id($section, $slot);
				if(!isset($keys_raw[$kid]))
				{
					$keys_raw[$kid] = array(
						'key_id' => $kid,
						'section' => $section,
						'section_title' => $section_title,
						'slot' => $slot,
						'type' => 0,
						'value' => trim($m[2]),
						'title' => '',
						'line_value' => $li,
					);
				}
				else
				{
					$keys_raw[$kid]['value'] = trim($m[2]);
					$keys_raw[$kid]['line_value'] = $li;
				}
				continue;
			}

			if(preg_match('/^Fkey(\d+)\s+Title\s*:\s*(.*)$/', $line, $m))
			{
				$slot = intval($m[1]);
				$kid = $this->key_id($section, $slot);
				if(!isset($keys_raw[$kid]))
				{
					$keys_raw[$kid] = array(
						'key_id' => $kid,
						'section' => $section,
						'section_title' => $section_title,
						'slot' => $slot,
						'type' => 0,
						'value' => '',
						'title' => trim($m[2]),
						'line_title' => $li,
					);
				}
				else
				{
					$keys_raw[$kid]['title'] = trim($m[2]);
					$keys_raw[$kid]['line_title'] = $li;
				}
				continue;
			}
		}

		$speed = array();
		foreach($keys_raw as $k)
		{
			if(intval($k['type']) !== 1)
			{
				continue;
			}

			$num = $this->number_from_value($k['value']);

			$line_no = 0;
			if(isset($k['line_value']))
			{
				$line_no = intval($k['line_value']) + 1;
			}
			elseif(isset($k['line_title']))
			{
				$line_no = intval($k['line_title']) + 1;
			}

			$speed[] = array(
				'key_id' => $k['key_id'],
				'section' => $k['section'],
				'section_title' => $k['section_title'],
				'slot' => intval($k['slot']),
				'type' => intval($k['type']),
				'number' => $num,
				'label' => $k['title'],
				'value' => $k['value'],
				'line' => $line_no,
			);
		}

		usort($speed, function($a, $b)
		{
			$c = strcmp($a['section'], $b['section']);
			if($c !== 0)
			{
				return $c;
			}

			return $a['slot'] - $b['slot'];
		});

		$phone = '';
		if(isset($sip['SIP1 Phone Number']))
		{
			$phone = trim($sip['SIP1 Phone Number']);
		}
		elseif(isset($sip['SIP1 Register User']))
		{
			$phone = trim($sip['SIP1 Register User']);
		}

		$display = isset($sip['SIP1 Display Name']) ? trim($sip['SIP1 Display Name']) : '';

		return array(
			'vendor' => 'fanvil',
			'phone' => $phone,
			'displayName' => $display,
			'model_hint' => isset($net['Vendor Class ID']) ? $net['Vendor Class ID'] : '',
			'speedDialKeys' => $speed,
			'keys_raw' => $keys_raw,
			'sip' => $sip,
			'lines' => $lines,
			'dss_index' => $dss_index,
		);
	}

	public function editor_speed_dial_keys($parsed)
	{
		$out = array();
		if(!isset($parsed['keys_raw']) || !is_array($parsed['keys_raw']))
		{
			return $out;
		}

		foreach($parsed['keys_raw'] as $k)
		{
			if(!$this->section_is_dial_editable(isset($k['section_title']) ? $k['section_title'] : ''))
			{
				continue;
			}

			$val = isset($k['value']) ? $k['value'] : '';
			$t2val = $this->normalize_type2_line_value($val);
			$t3val = $this->normalize_type3_line_value($val);
			$special = $t2val !== NULL || $t3val !== NULL;
			if($t3val !== NULL)
			{
				$num = $t3val;
			}
			elseif($t2val !== NULL)
			{
				$num = $t2val;
			}
			else
			{
				$num = $this->number_from_value($val);
			}

			$label = isset($k['title']) ? $k['title'] : '';
			if($label === '' && $t3val !== NULL)
			{
				$label = $this->default_title_type3($t3val);
			}

			$out[] = array(
				'key_id' => $k['key_id'],
				'section' => $k['section'],
				'section_title' => $k['section_title'],
				'slot' => intval($k['slot']),
				'type' => intval($k['type']),
				'number' => $num,
				'label' => $label,
				'value' => $val,
				'dial_suffix' => $special ? '' : $this->dial_suffix_from_value($val),
				'fkey_auto' => $special,
			);
		}

		usort($out, function($a, $b)
		{
			$c = strcmp($a['section'], $b['section']);
			if($c !== 0)
			{
				return $c;
			}

			return $a['slot'] - $b['slot'];
		});

		return $out;
	}

	public function build_dss_search($parsed)
	{
		$parts = array();
		foreach($parsed['speedDialKeys'] as $k)
		{
			$parts[] = $k['number'].' '.$k['label'];
		}

		return implode(' ', $parts);
	}

	public function apply_speed_dials(&$lines, $keys_raw, $speedDialKeys, $dss_use_index = -1)
	{
		$by_id = array();
		foreach($speedDialKeys as $k)
		{
			if(isset($k['key_id']))
			{
				$by_id[$k['key_id']] = $k;
				continue;
			}

			$sec = isset($k['section']) ? $k['section'] : '';
			$by_id[$this->key_id($sec, intval($k['slot']))] = $k;
		}

		foreach($keys_raw as $kid => $k)
		{
			if(!isset($by_id[$kid]))
			{
				continue;
			}

			$upd = $by_id[$kid];
			$old_val = isset($k['value']) ? $k['value'] : '';
			$num = isset($upd['number']) ? trim($upd['number']) : '';
			$title = isset($upd['label']) ? trim($upd['label']) : (isset($upd['title']) ? trim($upd['title']) : '');
			$slot = intval($k['slot']);

			if($num === '' && $title === '')
			{
				continue;
			}

			$type2_val = $this->normalize_type2_line_value($num);
			if($type2_val !== NULL)
			{
				$this->set_fkey_field($lines, $slot, 'Type', '2', isset($k['line_type']) ? $k['line_type'] : NULL);
				$this->set_fkey_field($lines, $slot, 'Value', $type2_val, isset($k['line_value']) ? $k['line_value'] : NULL);
				if(isset($k['line_title']) && isset($lines[$k['line_title']]))
				{
					$lines[$k['line_title']] = $this->set_line_colon_value($lines[$k['line_title']], $title);
				}

				continue;
			}

			$type3_val = $this->normalize_type3_line_value($num);
			if($type3_val !== NULL)
			{
				if($title === '')
				{
					$title = $this->default_title_type3($type3_val);
				}

				$this->set_fkey_field($lines, $slot, 'Type', '3', isset($k['line_type']) ? $k['line_type'] : NULL);
				$this->set_fkey_field($lines, $slot, 'Value', $type3_val, isset($k['line_value']) ? $k['line_value'] : NULL);
				if(isset($k['line_title']) && isset($lines[$k['line_title']]))
				{
					$lines[$k['line_title']] = $this->set_line_colon_value($lines[$k['line_title']], $title);
				}

				continue;
			}

			if(intval($k['type']) !== 1 && $num !== '')
			{
				$this->set_fkey_field($lines, $slot, 'Type', '1', isset($k['line_type']) ? $k['line_type'] : NULL);
			}

			if(array_key_exists('dial_suffix', $upd))
			{
				$suffix = (string)$upd['dial_suffix'];
				$val = $num !== '' ? $num.$suffix : $old_val;
			}
			elseif(isset($upd['value']) && $upd['value'] !== '')
			{
				$val = $upd['value'];
			}
			else
			{
				$val = $this->build_dial_value($num, $old_val);
			}

			if(isset($k['line_value']) && isset($lines[$k['line_value']]))
			{
				$lines[$k['line_value']] = $this->set_line_colon_value($lines[$k['line_value']], $val);
			}
			if(isset($k['line_title']) && isset($lines[$k['line_title']]))
			{
				$lines[$k['line_title']] = $this->set_line_colon_value($lines[$k['line_title']], $title);
			}
		}

		return implode("\n", $lines);
	}

	public function apply_sip_fields(&$lines, $sip_updates)
	{
		foreach($lines as $i => $line)
		{
			foreach($sip_updates as $field => $new_val)
			{
				if(strpos($line, $field) === 0 && strpos($line, ':') !== FALSE)
				{
					$lines[$i] = $field.str_repeat(' ', max(1, 24 - strlen($field))).':'.$new_val;
				}
			}
		}

		return implode("\n", $lines);
	}

	public function remap_slots($parsed, $new_order)
	{
		$lines = $parsed['lines'];
		$type1 = array();
		foreach($parsed['keys_raw'] as $kid => $k)
		{
			if(intval($k['type']) === 1)
			{
				$type1[$kid] = $k;
			}
		}

		$ordered = array();
		foreach($new_order as $id)
		{
			$id = (string)$id;
			if(isset($type1[$id]))
			{
				$ordered[] = $type1[$id];
			}
		}

		if(!count($ordered))
		{
			foreach($new_order as $slot)
			{
				$slot = intval($slot);
				foreach($type1 as $kid => $k)
				{
					if(intval($k['slot']) === $slot)
					{
						$ordered[] = $k;
						break;
					}
				}
			}
		}

		$by_section = array();
		foreach($type1 as $kid => $k)
		{
			$by_section[$k['section']][] = $k;
		}

		foreach($by_section as $section => $list)
		{
			usort($list, function($a, $b) { return $a['slot'] - $b['slot']; });
			$section_order = array();
			foreach($ordered as $k)
			{
				if($k['section'] === $section)
				{
					$section_order[] = $k;
				}
			}

			if(!count($section_order))
			{
				continue;
			}

			for($i = 0; $i < count($section_order) && $i < count($list); $i++)
			{
				$target = $list[$i];
				$src = $section_order[$i];
				if(!isset($lines[$src['line_value']]) || !isset($lines[$src['line_title']]))
				{
					continue;
				}

				preg_match('/Value\s*:\s*(.*)$/', $lines[$src['line_value']], $vm);
				$v = isset($vm[1]) ? $vm[1] : '';
				preg_match('/Title\s*:\s*(.*)$/', $lines[$src['line_title']], $tm);
				$t = isset($tm[1]) ? $tm[1] : '';
				$slot = intval($target['slot']);
				if(isset($target['line_value']))
				{
					$lines[$target['line_value']] = 'Fkey'.$slot.' Value              :'.$v;
				}
				if(isset($target['line_title']))
				{
					$lines[$target['line_title']] = 'Fkey'.$slot.' Title              :'.$t;
				}
			}
		}

		return implode("\n", $lines);
	}
}
