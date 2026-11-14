<?php

class TftpYealinkParser
{
	public function parse($content)
	{
		$phone = '';
		$display = '';
		$speed = array();

		if(preg_match('/account\.1\.user_name\s*=\s*(.+)/', $content, $m))
		{
			$phone = trim($m[1]);
		}
		if(preg_match('/account\.1\.display_name\s*=\s*(.+)/', $content, $m))
		{
			$display = trim($m[1]);
		}

		if(preg_match_all('/linekey\.(\d+)\.type\s*=\s*(\d+)/', $content, $types, PREG_SET_ORDER))
		{
			foreach($types as $t)
			{
				$slot = intval($t[1]);
				$type = intval($t[2]);
				if($type !== 13 && $type !== 1)
				{
					continue;
				}

				$label = '';
				$val = '';
				if(preg_match('/linekey\.'.$slot.'\.label\s*=\s*(.+)/', $content, $lm))
				{
					$label = trim($lm[1]);
				}
				if(preg_match('/linekey\.'.$slot.'\.value\s*=\s*(.+)/', $content, $vm))
				{
					$val = trim($vm[1]);
				}

				$num = $val;
				if(preg_match('/^(\d+)/', $val, $nm))
				{
					$num = $nm[1];
				}

				$speed[] = array('slot' => $slot, 'type' => $type, 'number' => $num, 'label' => $label, 'value' => $val);
			}
		}

		return array(
			'vendor' => 'yealink',
			'phone' => $phone,
			'displayName' => $display,
			'model_hint' => 'yealink',
			'speedDialKeys' => $speed,
			'raw' => $content,
			'lines' => preg_split('/\r\n|\r|\n/', $content),
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

	public function apply_linekey($content, $speedDialKeys)
	{
		$lines = preg_split('/\r\n|\r|\n/', $content);
		foreach($speedDialKeys as $k)
		{
			$slot = intval($k['slot']);
			foreach($lines as $i => $line)
			{
				if(preg_match('/^linekey\.'.$slot.'\.label\s*=/', $line))
				{
					$lines[$i] = 'linekey.'.$slot.'.label = '.(isset($k['label']) ? $k['label'] : '');
				}
				if(preg_match('/^linekey\.'.$slot.'\.value\s*=/', $line))
				{
					$val = isset($k['value']) ? $k['value'] : (isset($k['number']) ? $k['number'] : '');
					$lines[$i] = 'linekey.'.$slot.'.value = '.$val;
				}
			}
		}

		return implode("\n", $lines);
	}
}
