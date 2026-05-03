CREATE TABLE `trocas_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quartelId` int NOT NULL,
	`bombeiroEntraId` int NOT NULL,
	`bombeireSaiId` int NOT NULL,
	`dataTroca` date NOT NULL,
	`dataPagamento` date,
	`numeroSEI` varchar(50),
	`numeroParte` varchar(20),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trocas_servico_id` PRIMARY KEY(`id`)
);
