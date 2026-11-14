<?php

class TftpSyncSources
{
	public static function fetch_map(&$core)
	{
		$source = $core->Config->get_global('tftpboot_sync_source', 'phonebook');
		$map = array();

		if($source === 'phonebook')
		{
			$contacts = array();
			if($core->db->select_assoc_ex($contacts, rpv(
				'SELECT `phone_internal`, `last_name`, `first_name`, `middle_name` FROM `@contacts` WHERE (`flags` & 1) = 1 AND `phone_internal` <> \'\''
			)))
			{
				foreach($contacts as $c)
				{
					$num = preg_replace('/[^0-9]/', '', $c['phone_internal']);
					$map[$num] = tftpboot_format_initials($c['last_name'], $c['first_name'], $c['middle_name']);
					$map[$c['phone_internal']] = $map[$num];
				}
			}

			return $map;
		}

		if($source === 'custom_url')
		{
			$url = trim($core->Config->get_global('tftpboot_sync_custom_url', ''));
			if($url === '' || !preg_match('#^https?://#i', $url))
			{
				return $map;
			}

			$body = self::http_get($url, 8);
			$data = json_decode($body, TRUE);
			if(!is_array($data))
			{
				return $map;
			}

			foreach($data as $row)
			{
				if(!isset($row['number']) || !isset($row['name']))
				{
					continue;
				}

				$num = preg_replace('/[^0-9]/', '', (string)$row['number']);
				$map[$num] = (string)$row['name'];
			}

			return $map;
		}

		if($source === 'api')
		{
			$base = trim($core->Config->get_global('tftpboot_sync_api_url', ''));
			$key = trim($core->Config->get_global('tftpboot_sync_api_key', ''));
			if($base === '')
			{
				$base = self::default_api_base();
			}

			$phones = array();
			if($core->db->select_assoc_ex($phones, rpv('SELECT DISTINCT `phone_internal` FROM `@contacts` WHERE (`flags` & 1) = 1 AND `phone_internal` <> \'\' LIMIT 5000')))
			{
				foreach($phones as $p)
				{
					$num = preg_replace('/[^0-9]/', '', $p['phone_internal']);
					if(strlen($num) < 3)
					{
						continue;
					}

					$url = str_replace(array('{NUMBER}', '{API_KEY}'), array(rawurlencode($num), rawurlencode($key)), $base);
					if(strpos($url, 'API_KEY') === FALSE && $key !== '')
					{
						$url .= (strpos($url, '?') === FALSE ? '?' : '&').'API_KEY='.rawurlencode($key);
					}
					if(strpos($url, 'NUMBER') === FALSE)
					{
						$url .= (strpos($url, '?') === FALSE ? '?' : '&').'NUMBER='.rawurlencode($num);
					}

					$name = trim(self::http_get($url, 5));
					if($name !== '' && $name !== $num)
					{
						$map[$num] = $name;
					}
				}
			}

			return $map;
		}

		return $map;
	}

	private static function default_api_base()
	{
		if(defined('WEB_URL'))
		{
			$u = rtrim(WEB_URL, '/');
			$u = preg_replace('#/pb/?$#', '', $u);

			return $u.'/api.php?NUMBER={NUMBER}';
		}

		return '';
	}

	private static function http_get($url, $timeout = 10)
	{
		$ctx = stream_context_create(array(
			'http' => array(
				'timeout' => $timeout,
				'follow_location' => 0,
				'max_redirects' => 0,
			),
		));

		$body = @file_get_contents($url, FALSE, $ctx);
		if($body === FALSE)
		{
			return '';
		}

		if(strlen($body) > 500000)
		{
			return '';
		}

		return $body;
	}
}
