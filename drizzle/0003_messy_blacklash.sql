CREATE TABLE `bombeiro_prontidao_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`bombeiroId` int NOT NULL,
	`equipe` enum('Prontidão Verde','Prontidão Azul','Prontidão Amarela','Administrativo') NOT NULL,
	`dataInicio` date NOT NULL,
	`dataFim` date,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bombeiro_prontidao_historico_id` PRIMARY KEY(`id`)
);
