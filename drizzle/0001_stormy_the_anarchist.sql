CREATE TABLE `afastamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`bombeiroId` int NOT NULL,
	`tipo` enum('ferias','licenca_medica','dispensa','outros') NOT NULL,
	`dataInicio` date NOT NULL,
	`dataFim` date NOT NULL,
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `afastamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bombeiros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`nome` varchar(200) NOT NULL,
	`posto` varchar(100) NOT NULL,
	`equipe` enum('VD','VA','VB','VC') NOT NULL,
	`dataInicio` date NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bombeiros_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escalas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`equipe` enum('VD','VA','VB','VC') NOT NULL,
	`dataInicio` date NOT NULL,
	`dataFim` date NOT NULL,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escalas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prontidoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`bombeiroId` int NOT NULL,
	`data` date NOT NULL,
	`equipe` enum('VD','VA','VB','VC') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prontidoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quarteis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(200) NOT NULL,
	`sigla` varchar(20) NOT NULL,
	`cidade` varchar(100),
	`estado` varchar(2),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quarteis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quartel_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','operador') NOT NULL DEFAULT 'operador',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quartel_users_id` PRIMARY KEY(`id`)
);
