-- Seed default quiz decks and questions
-- Run after schema.sql

-- Default deck: 考研政治基础
INSERT INTO quiz_decks (id, title, description, is_default, tags)
VALUES ('d0000000-0000-0000-0000-000000000001', '考研政治基础', '考研政治马克思主义基本原理概论高频考点', true, '{考研,政治,马原}');

-- Questions for deck 1
INSERT INTO quiz_questions (deck_id, type, question, options, answer, explanation, tags, sort_order) VALUES
('d0000000-0000-0000-0000-000000000001', 'choice', '马克思主义最根本的世界观和方法论是：', '{"A":"辩证唯物主义和历史唯物主义","B":"唯物主义辩证法","C":"历史唯物主义","D":"辩证唯物主义"}', 'A', '辩证唯物主义和历史唯物主义是马克思主义最根本的世界观和方法论，也是马克思主义理论体系的哲学基础。', '{马原,哲学}', 1),
('d0000000-0000-0000-0000-000000000001', 'choice', '马克思主义的基本立场是：', '{"A":"无产阶级的立场","B":"人民立场","C":"工人阶级的立场","D":"劳动者的立场"}', 'B', '马克思主义的基本立场是人民立场，始终站在最广大人民的立场上，为最广大人民谋利益。', '{马原,立场}', 2),
('d0000000-0000-0000-0000-000000000001', 'choice', '思维和存在的关系问题是：', '{"A":"哲学的基本问题","B":"哲学的重要问题","C":"哲学的一般问题","D":"哲学的核心问题"}', 'A', '恩格斯指出：全部哲学，特别是近代哲学的重大的基本问题，是思维和存在的关系问题。', '{马原,哲学基本问题}', 3),
('d0000000-0000-0000-0000-000000000001', 'truefalse', '唯物主义认为物质第一性，意识第二性。', '{}', '对', '唯物主义的基本观点：物质是世界的本原，意识是物质的产物和反映。', '{马原,唯物主义}', 4),
('d0000000-0000-0000-0000-000000000001', 'fill', '马克思主义主要由三个部分组成：马克思主义哲学、马克思主义政治经济学和____。', '{}', '科学社会主义', '马克思主义的三个组成部分：马克思主义哲学（辩证唯物主义和历史唯物主义）、马克思主义政治经济学和科学社会主义。', '{马原,组成部分}', 5);

-- Default deck: 英语四六级高频词汇
INSERT INTO quiz_decks (id, title, description, is_default, tags)
VALUES ('d0000000-0000-0000-0000-000000000002', '英语四六级高频词汇', '大学英语四六级考试高频核心词汇', true, '{英语,CET4,CET6,词汇}');

INSERT INTO quiz_questions (deck_id, type, question, options, answer, explanation, tags, sort_order) VALUES
('d0000000-0000-0000-0000-000000000002', 'choice', 'abandon 的正确中文含义是：', '{"A":"放弃","B":"获得","C":"坚持","D":"遵守"}', 'A', 'abandon = 放弃，遗弃。例：They had to abandon their plan.', '{词汇,动词}', 1),
('d0000000-0000-0000-0000-000000000002', 'choice', 'The new policy will come into ____ next month.', '{"A":"effect","B":"affect","C":"effort","D":"efficient"}', 'A', 'come into effect = 生效。affect 是动词"影响"，effort 是"努力"，efficient 是形容词"高效的"。', '{词汇,搭配}', 2),
('d0000000-0000-0000-0000-000000000002', 'choice', '选择一个与其余三个词义不同的词：', '{"A":"significant","B":"substantial","C":"considerable","D":"subordinate"}', 'D', 'significant/sustainable/considerable 都表示"重大的、大量的"，subordinate 表示"下属的、次要的"。', '{词汇,近义词}', 3),
('d0000000-0000-0000-0000-000000000002', 'fill', 'The government has taken measures to ____ (促进) economic growth.', '{}', 'promote', 'promote = 促进、推动。常见搭配：promote economic growth / promote the development of', '{词汇,动词,翻译}', 4);
