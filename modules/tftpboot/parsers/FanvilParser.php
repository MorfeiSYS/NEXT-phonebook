<?php

class TftpFanvilParser
{
	public function parse($content)
	{
		$lines = preg_split('/\r\n|\r|\n/', $content);
		$sip = array();
		$keys = array();
		$net = array();
		$in_dss = FALSE;
		$dss_index = -1;

		foreach($lines as $li => $line)
		{
			if(strpos($line, '<DSSKEY CONFIG MODULE>') !== FALSE)
			{
				$in_dss = TRUE;
				$dss_index++;
				continue;
			}

			if($in_dss && preg_match('/^Fkey(\d+)\s+Type\s*:\s*(\d+)/', $line, $m))
			{
				$slot = intval($m[1]);
				$type = intval($m[2]);
				if(!isset($keys[$slot]))
				{
					$keys[$slot] = array('slot' => $slot, 'type' => $type, 'value' => '', 'title' => '', 'line_type' => $li);
				}
				else
				{
					$keys[$slot]['type'] = $type;
					$keys[$slot]['line_type'] = $li;
				}
				continue;
			}

			if($in_dss && preg_match('/^Fkey(\d+)\s+Value\s*:\s*(.*)$/', $line, $m))
			{
				$slot = intval($m[1]);
				if(!isset($keys[$slot]))
				{
					$keys[$slot] = array('slot' => $slot, 'type' => 0, 'value' => trim($m[2]), 'title' => '', 'line_value' => $li);
				}
				else
				{
					$keys[$slot]['value'] = trim($m[2]);
					$keys[$slot]['line_value'] = $li;
				}
				continue;
			}

			if($in_dss && preg_match('/^Fkey(\d+)\s+Title\s*:\s*(.*)$/', $line, $m))
			{
				$slot = intval($m[1]);
				if(!isset($keys[$slot]))
				{
					$keys[$slot] = array('slot' => $slot, 'type' => 0, 'value' => '', 'title' => trim($m[2]), 'line_title' => $li);
				}
				else
				{
					$keys[$slot]['title'] = trim($m[2]);
					$keys[$slot]['line_title'] = $li;
				}
				continue;
			}

			if(preg_match('/^(\S.*?)\s*:\s*(.*)$/', $line, $m))
			{
				$key = trim($m[1]);
				$val = $m[2];
				if(strpos($key, 'SIP1 ') === 0)
				{
					$sip[$key] = $val;
				}
				if($key === 'Vendor Class ID')
				{
					$net['Vendor Class ID'] = trim($val);
				}
			}
		}

		$speed = array();
		foreach($keys as $slot => $k)
		{
			if(intval($k['type']) !== 1)
			{
				continue;
			}

			$num = $k['value'];
			if(preg_match('/^(\d+)@/', $num, $nm))
			{
				$num = $nm[1];
			}

			$speed[] = array(
				'slot' => $slot,
				'type' => intval($k['type']),
				'number' => $num,
				'label' => $k['title'],
				'value' => $k['value'],
			);
		}

		usort($speed, function($a, $b) { return $a['slot'] - $b['slot']; });

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
			'keys_raw' => $keys,
			'sip' => $sip,
			'lines' => $lines,
			'dss_index' => $dss_index,
		);
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
		$by_slot = array();
		foreach($speedDialKeys as $k)
		{
			$by_slot[intval($k['slot'])] = $k;
		}

		foreach($keys_raw as $slot => $k)
		{
			if(intval($k['type']) !== 1 || !isset($by_slot[$slot]))
			{
				continue;
			}

			$upd = $by_slot[$slot];
			$val = isset($upd['value']) && $upd['value'] !== '' ? $upd['value'] : (isset($upd['number']) ? $upd['number'].'@1/f' : '');
			$title = isset($upd['label']) ? $upd['label'] : '';

			if(isset($k['line_value']) && isset($lines[$k['line_value']]))
			{
				$lines[$k['line_value']] = 'Fkey'.$slot.' Value              :'.$val;
			}
			if(isset($k['line_title']) && isset($lines[$k['line_title']]))
			{
				$lines[$k['line_title']] = 'Fkey'.$slot.' Title              :'.$title;
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
		foreach($parsed['keys_raw'] as $slot => $k)
		{
			if(intval($k['type']) === 1)
			{
				$type1[$slot] = $k;
			}
		}

		$ordered = array();
		foreach($new_order as $slot)
		{
			$slot = intval($slot);
			if(isset($type1[$slot]))
			{
				$ordered[] = $type1[$slot];
			}
		}

		$slots = array_keys($type1);
		sort($slots, SORT_NUMERIC);

		for($i = 0; $i < count($ordered) && $i < count($slots); $i++)
		{
			$target = $slots[$i];
			$src = $ordered[$i];
			if(isset($lines[$src['line_value']]))
			{
				preg_match('/Value\s*:\s*(.*)$/', $lines[$src['line_value']], $vm);
				$v = isset($vm[1]) ? $vm[1] : '';
				preg_match('/Title\s*:\s*(.*)$/', $lines[$src['line_title']], $tm);
				$t = isset($tm[1]) ? $tm[1] : '';
				if(isset($type1[$target]['line_value']))
				{
					$lines[$type1[$target]['line_value']] = 'Fkey'.$target.' Value              :'.$v;
				}
				if(isset($type1[$target]['line_title']))
				{
					$lines[$type1[$target]['line_title']] = 'Fkey'.$target.' Title              :'.$t;
				}
			}
		}

		return implode("\n", $lines);
	}
}
