create table if not exists user (
	user_id text primary key,
	name text,
	login text unique,
	password_hash text
);

create table if not exists project (
	project_id text primary key,
	name text,
	sequence integer,
	user_id text,
	foreign key(user_id) references user(user_id)
);

create table if not exists task_group (
	task_group_id text primary key,
	name text,
	sequence integer,
	is_default integer,
	project_id text,
	foreign key (project_id) references project(project_id)
);

create table if not exists task_status (
	task_status_id int,
	name text
);

create table if not exists task (
	task_id text primary key,
	name text,
	sequence integer,
	task_status_id int,
	task_group_id text,
	foreign key (task_status_id) references task_status(task_status_id),
	foreign key (task_group_id) references task_group (task_group_id)
);

insert into task_status (task_status_id, name)
select  task_status_id, name
from (
	select 1 as task_status_id, 'to do' as name
	union all 
	select 2 as task_status_id, 'in progress' as name
	union all
	select 3 as task_status_id, 'done' as name
	union all
	select 4 as task_status_id, 'cancelled' as name
	union all
	select 5 as task_status_id, 'deleted' as name
	) t
where not exists (
	select 1
	from task_status ts
	where ts.task_status_id = t.task_status_id
);