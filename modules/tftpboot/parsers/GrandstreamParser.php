<?php

class TftpGrandstreamParser
{
	public function parse($content)
	{
		$phone = '';
		if(preg_match('/<P735>([^<]*)<\/P735>/', $content, $m))
		{
			$phone = trim($m[1]);
		}

		return array(
			'vendor' => 'grandstream',
			'phone' => $phone,
			'displayName' => $phone,
			'model_hint' => 'grandstream',
			'speedDialKeys' => array(),
			'raw' => $content,
		);
	}

	public function build_dss_search($parsed)
	{
		return $parsed['phone'];
	}
}
