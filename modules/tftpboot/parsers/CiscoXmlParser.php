<?php

class TftpCiscoXmlParser
{
	public function parse($content)
	{
		$phone = '';
		$display = '';
		$speed = array();
		$slot = 0;

		if(preg_match('/<featureLabel>([^<]*)<\/featureLabel>\s*<name>([^<]*)<\/name>/s', $content, $m))
		{
			$phone = trim($m[2]);
			$display = trim($m[1]);
		}

		if(preg_match_all('/<line button="(\d+)">(.*?)<\/line>/s', $content, $blocks, PREG_SET_ORDER))
		{
			foreach($blocks as $b)
			{
				$btn = intval($b[1]);
				$xml = $b[2];
				if(preg_match('/<featureID>21<\/featureID>/', $xml))
				{
					$label = '';
					$num = '';
					if(preg_match('/<featureLabel>([^<]*)<\/featureLabel>/', $xml, $lm))
					{
						$label = trim($lm[1]);
					}
					if(preg_match('/<speedDialNumber>([^<]*)<\/speedDialNumber>/', $xml, $nm))
					{
						$num = trim($nm[1]);
					}
					$speed[] = array('slot' => $btn, 'type' => 21, 'number' => $num, 'label' => $label, 'value' => $num);
				}
			}
		}

		return array(
			'vendor' => 'cisco',
			'phone' => $phone,
			'displayName' => $display,
			'model_hint' => 'cisco',
			'speedDialKeys' => $speed,
			'raw' => $content,
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

	public function apply_speed_dials($content, $speedDialKeys)
	{
		foreach($speedDialKeys as $k)
		{
			$btn = intval($k['slot']);
			$label = htmlspecialchars($k['label'], ENT_XML1 | ENT_COMPAT, 'UTF-8');
			$num = htmlspecialchars($k['number'], ENT_XML1 | ENT_COMPAT, 'UTF-8');
			$pattern = '/(<line button="'.$btn.'">.*?<featureID>21<\/featureID>.*?<featureLabel>)[^<]*(.*?<speedDialNumber>)[^<]*/s';
			$content = preg_replace($pattern, '${1}'.$label.'${2}'.$num, $content, 1, $cnt);
			if(!$cnt && preg_match('/<featureLabel>([^<]*)<\/featureLabel>.*?<speedDialNumber>[^<]*/s', $content))
			{
				/* skip missing buttons */
			}
		}

		return $content;
	}
}
