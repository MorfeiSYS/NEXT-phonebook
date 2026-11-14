<?php

function logs(&$core, $params, $post_data)
{
	assert_admin_page($core);

	$logs = NULL;

	$total = 0;
	$offset = 0;
	if(!empty($params[1]))
	{
		$offset = intval($params[1]);
	}

	$search = '';
	$where = '';
	if(!empty($params[2]))
	{
		$search = trim(urldecode($params[2]));
		if(!empty($search))
		{
			$esc = sql_escape($search);
			$where = rpv('
					WHERE
						l.`operation` LIKE \'%{r0}%\'
						OR l.`params` LIKE \'%{r0}%\'
						OR u.`login` LIKE \'%{r0}%\'
				',
				$esc
			);
		}
	}

	$logs_total = array();

	if($core->db->select_ex($logs_total, rpv('
			SELECT
				COUNT(*)
			FROM `@logs` AS l
			LEFT JOIN `@users` AS u ON u.`id` = l.`uid`
			{r0}
		',
		$where
	)))
	{
		$total = intval($logs_total[0][0]);
	}

	$core->db->select_assoc_ex($logs, rpv('
			SELECT
				l.`id`,
				l.`date`,
				l.`uid`,
				l.`operation`,
				l.`params`,
				u.`login`
			FROM `@logs` AS l
			LEFT JOIN `@users` AS u ON u.`id` = l.`uid`
			{r0}
			ORDER BY
				l.`date` DESC,
				l.`id` DESC
			LIMIT {d1},100
		',
		$where,
		$offset
	));

	include(TEMPLATES_DIR.'tpl.logs.php');
}