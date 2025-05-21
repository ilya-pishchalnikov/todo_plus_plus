create table if not exists user (
	user_id text primary key,
	name text,
	login text,
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
	task_status_id text,
	name text
);

create table if not exists task (
	task_id text primary key,
	name text,
	sequence integer,
	task_status_id text,
	foreign key (task_status_id) references task_status(task_status_id)
);