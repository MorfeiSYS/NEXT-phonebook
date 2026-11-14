<?php

class TftpEltexParser
{
	public function parse($content)
	{
		$phone = '';
		if(preg_match('/Number:\s*"([^"]+)"/', $content, $m))
		{
			$phone = trim($m[1]);
		}

		return array(
			'vendor' => 'eltex',
			'phone' => $phone,
			'displayName' => $phone,
			'model_hint' => 'eltex',
			'speedDialKeys' => array(),
			'raw' => $content,
		);
	}

	public function build_dss_search($parsed)
	{
		return $parsed['phone'];
	}
}
