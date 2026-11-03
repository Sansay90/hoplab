--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    token_hash character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind character varying NOT NULL,
    token_hash character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: brew_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brew_entries (
    id uuid NOT NULL,
    brew_id uuid NOT NULL,
    at timestamp with time zone NOT NULL,
    kind character varying NOT NULL,
    value double precision,
    text character varying,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: brews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brews (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    device_id uuid,
    recipe_id uuid,
    name character varying NOT NULL,
    recipe jsonb NOT NULL,
    status character varying NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    energy_wh double precision DEFAULT '0'::double precision NOT NULL,
    source character varying DEFAULT 'device'::character varying NOT NULL,
    plan jsonb,
    reminded jsonb DEFAULT '[]'::jsonb NOT NULL,
    equipment_id uuid,
    snapshot jsonb,
    day_ended_at timestamp with time zone
);


--
-- Name: comment_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_votes (
    user_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    value integer NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    text character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    tuya_id character varying NOT NULL,
    name character varying NOT NULL,
    model character varying,
    created_at timestamp with time zone NOT NULL,
    agent_id uuid,
    limits jsonb
);


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    kind character varying NOT NULL,
    device_id uuid,
    volume double precision,
    efficiency double precision,
    evaporation double precision,
    main boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    kettle double precision,
    props jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    device_id uuid NOT NULL,
    brew_id uuid,
    at timestamp with time zone NOT NULL,
    kind character varying NOT NULL,
    text character varying NOT NULL,
    data jsonb
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind character varying NOT NULL,
    actor_id uuid,
    recipe_id uuid,
    comment_id uuid,
    created_at timestamp with time zone NOT NULL,
    read_at timestamp with time zone,
    brew_id uuid,
    data jsonb
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    endpoint character varying NOT NULL,
    p256dh character varying NOT NULL,
    auth character varying NOT NULL,
    user_agent character varying,
    created_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone NOT NULL
);


--
-- Name: readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readings (
    id bigint NOT NULL,
    device_id uuid NOT NULL,
    brew_id uuid,
    at timestamp with time zone NOT NULL,
    temp double precision NOT NULL,
    target double precision,
    step integer,
    status character varying
);


--
-- Name: readings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.readings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.readings_id_seq OWNED BY public.readings.id;


--
-- Name: recipe_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_photos (
    id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content_type character varying NOT NULL,
    data bytea NOT NULL,
    credit character varying,
    created_at timestamp with time zone NOT NULL,
    thumb bytea
);


--
-- Name: recipe_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_votes (
    user_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    value integer NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    data jsonb NOT NULL,
    visibility character varying DEFAULT 'private'::character varying NOT NULL,
    published_at timestamp with time zone
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying NOT NULL,
    user_agent character varying,
    created_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name character varying,
    email character varying,
    created_at timestamp with time zone NOT NULL,
    password_hash character varying,
    email_verified_at timestamp with time zone,
    role character varying DEFAULT 'user'::character varying NOT NULL,
    name_key character varying,
    avatar bytea,
    avatar_version integer DEFAULT 0 NOT NULL,
    push_comments boolean DEFAULT true NOT NULL,
    push_brews boolean DEFAULT true NOT NULL
);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: readings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readings ALTER COLUMN id SET DEFAULT nextval('public.readings_id_seq'::regclass);


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.agents (id, user_id, name, token_hash, created_at, last_seen_at) VALUES ('d5bf208e-233b-486e-83ba-01816efd97eb', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Запасной агент', 'ee4f301414a659b893f0d5d7aeb8dbfb9b496b1ac7106177183ddbf8ec08edac', '2026-11-03 20:50:34.836301+00', NULL);
INSERT INTO public.agents (id, user_id, name, token_hash, created_at, last_seen_at) VALUES ('c0ef5719-f1a9-45f9-81b6-20fa44e6fde1', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Агент дома', '8c1141cdcc853b7ca43ac1312fd7746d9f4501fba311b5fd854b89074ca5dba8', '2026-11-03 20:50:34.821271+00', '2026-11-03 20:50:34.865142+00');


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.alembic_version (version_num) VALUES ('c4e6a8b2d9f7');


--
-- Data for Name: auth_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('54ccd673-267d-4534-a7c5-841295b18ae0', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'verify', '51dcf1e49344b55efe930efd51ee2f756b3eb848750b7b1d1021b1df948459a2', '2026-11-03 20:50:30.421126+00', '2026-11-05 20:50:30.420961+00', '2026-11-03 20:50:30.52291+00');
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('fd483287-50c7-4e97-b827-ca189d08f4c8', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'verify', '815d6f820352c099b6185f6d7e1e8619f806c47a74a36dc7ce5d40d1850a91c8', '2026-11-03 20:50:30.705819+00', '2026-11-05 20:50:30.705716+00', '2026-11-03 20:50:30.852023+00');
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('198e343b-9eba-46f8-9e58-60fd319c1e22', '0261cc99-6dc7-4db2-aff2-e5793d925b06', 'verify', 'c8f51cd221ff5208f2e2d539d8da6b42c0b1994609b0fcb6cbf4c89eccdf25d1', '2026-11-03 20:50:31.22748+00', '2026-11-05 20:50:31.227377+00', NULL);
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('7db7924c-8b0a-435b-92df-fc76dc3ad387', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'reset', 'ad1f7e6c6635bd7631a5e388a78e274f0b6244ad10f3177ac80c675c1c992a4b', '2026-11-03 20:50:31.309559+00', '2026-11-03 21:50:31.30944+00', '2026-11-03 20:50:31.369452+00');
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('1e3d5366-92af-4661-a592-c68a2b2e0bf7', '0261cc99-6dc7-4db2-aff2-e5793d925b06', 'reset', '76c1ab16d98ef22415c664ccdb2c647f0a83df2f8be65fa38027d20e3c1e17e4', '2026-11-03 20:50:31.578358+00', '2026-11-03 21:50:31.578165+00', NULL);


--
-- Data for Name: brew_entries; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('7ac36514-a803-4173-afc4-469cc2bdb33c', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-24 20:50:30.012198+00', 'mash_temp', 65.2, NULL, '2026-11-03 20:50:35.492012+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('24bd4ba3-79a6-4b82-8727-2e5258b8799b', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-24 21:50:30.012198+00', 'og', 1.049, NULL, '2026-11-03 20:50:35.567424+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('4eb1a85d-cb6a-4a35-bea4-20bc21f9a8a1', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-24 22:50:30.012198+00', 'pitch', NULL, NULL, '2026-11-03 20:50:35.67322+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('33bf715a-80e8-492c-96eb-2be199662941', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-24 22:51:30.012198+00', 'pitch_temp', 12.5, NULL, '2026-11-03 20:50:35.782189+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('32389eee-6698-475b-a73e-c888d6051cf0', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-27 20:50:30.012198+00', 'gravity', 1.032, NULL, '2026-11-03 20:50:35.850217+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('fbe82852-13e8-446f-b32b-47da81dc9184', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-28 20:50:30.012198+00', 'note', NULL, 'Кружение на ночь', '2026-11-03 20:50:35.889152+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('38f0cb7b-6caa-4285-8d53-9992df2176c5', '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '2026-10-30 20:50:30.012198+00', 'gravity', 1.021, NULL, '2026-11-03 20:50:36.002186+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('ed0500d1-83d3-409f-825d-0b3afa9e9c4c', '66ddb304-02ce-42ce-9eab-0120f691c0eb', '2026-11-03 20:49:30.012198+00', 'pitch', NULL, NULL, '2026-11-03 20:50:36.277732+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('e2eb2be0-aa05-45d1-9900-08b6e933cb00', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 01:50:30.012198+00', 'pitch', NULL, NULL, '2026-11-03 20:50:39.776658+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('875e0180-f3d9-4ccc-8975-5c7d17333a97', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-11-02 20:50:30.012198+00', 'package', NULL, NULL, '2026-11-03 20:50:39.825731+00');


--
-- Data for Name: brews; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.brews (id, user_id, device_id, recipe_id, name, recipe, status, started_at, ended_at, energy_wh, source, plan, reminded, equipment_id, snapshot, day_ended_at) VALUES ('66ddb304-02ce-42ce-9eab-0120f691c0eb', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', NULL, '57cec314-0e32-4747-bfb5-5b2e7bc2671e', 'Чешский пилснер', '{}', 'finished', '2026-11-03 20:50:36.151913+00', '2026-11-03 20:49:30.012198+00', 0, 'manual', '{"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "volume": 20.0, "dryHops": [{"day": 5, "items": ["Saaz 20 г"], "gravity": null}], "efficiency": 72.0, "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days", "gravity": null}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days", "gravity": null}]}', '["dry-5", "measure-11"]', 'c6bc5635-8abc-446d-bca0-489a2f70bad8', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 26.7, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 20.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 20.0, "efficiency": 72.0, "evaporation": 3.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 1.92, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 2.31, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2, "attenuation": 80.0}], "targets": {"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "ebc": 10.599781271220357, "ibu": 21.980601119837132}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 4.073}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.231}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', '2026-11-03 20:49:30.012198+00');
INSERT INTO public.brews (id, user_id, device_id, recipe_id, name, recipe, status, started_at, ended_at, energy_wh, source, plan, reminded, equipment_id, snapshot, day_ended_at) VALUES ('7fb9548d-a6cf-489e-adc0-79d8ac97a563', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', NULL, '57cec314-0e32-4747-bfb5-5b2e7bc2671e', 'Чешский пилснер', '{}', 'finished', '2026-10-24 20:50:30.012198+00', NULL, 0, 'manual', '{"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "volume": 20.0, "dryHops": [{"day": 5, "items": ["Saaz 20 г"], "gravity": null}], "efficiency": 72.0, "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days", "gravity": null}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days", "gravity": null}]}', '["dry-5", "measure-13", "measure-20"]', 'c6bc5635-8abc-446d-bca0-489a2f70bad8', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 26.7, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 20.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 20.0, "efficiency": 72.0, "evaporation": 3.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 1.92, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 2.31, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2, "attenuation": 80.0}], "targets": {"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "ebc": 10.599781271220357, "ibu": 21.980601119837132}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 4.073}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.231}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', '2026-10-24 20:50:30.012198+00');
INSERT INTO public.brews (id, user_id, device_id, recipe_id, name, recipe, status, started_at, ended_at, energy_wh, source, plan, reminded, equipment_id, snapshot, day_ended_at) VALUES ('b13bc5a2-9522-492d-8ddb-9777e1b101eb', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '95f5c2f2-8027-479f-a962-0baa02581939', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', 'Чешский пилснер', '{"name": "Чешский пилснер", "slots": [{"items": [{"kind": "hop", "name": "Saaz", "unit": "g", "amount": 60.0, "minutes": 60, "whirlpool": null}], "label": "Saaz 60 г", "minutes": 60}, {"items": [{"kind": "hop", "name": "Saaz", "unit": "g", "amount": 40.0, "minutes": 15, "whirlpool": null}], "label": "Saaz 40 г", "minutes": 15}, {"items": [{"kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1.0, "minutes": 10, "whirlpool": null}], "label": "Ирландский мох 1 шт", "minutes": 10}], "steps": [{"boil": false, "name": "Белковая", "temp": 52.0, "watts": null, "minutes": 10}, {"boil": false, "name": "Осахаривание", "temp": 65.0, "watts": null, "minutes": 50}, {"boil": false, "name": "Мэш-аут", "temp": 78.0, "watts": null, "minutes": 10}, {"boil": true, "name": "Кипячение", "temp": 100.0, "watts": null, "minutes": 90}], "brewId": "b13bc5a2-9522-492d-8ddb-9777e1b101eb", "timers": [60, 15, 10], "recipeId": "57cec314-0e32-4747-bfb5-5b2e7bc2671e"}', 'finished', '2026-10-25 20:50:30.012198+00', '2026-10-26 00:50:30.012198+00', 6543.2, 'device', '{"fg": 1.0095011785708896, "og": 1.0475058928544483, "abv": 5.053180643775918, "volume": 30.0, "dryHops": [{"day": 5, "items": ["Saaz 30 г"], "gravity": null}], "efficiency": 75.0, "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days", "gravity": null}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days", "gravity": null}]}', '[]', '82ff7ebb-8a0f-48ff-b524-d444f28478c7', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 60.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 30.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 30.0, "efficiency": 75.0, "evaporation": 3.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 2.77, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 3.32, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2, "attenuation": 80.0}], "targets": {"fg": 1.0095011785708896, "og": 1.0475058928544483, "abv": 5.053180643775918, "ebc": 10.30010471720341, "ibu": 21.974861487078655}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 5.865}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.332}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', '2026-10-25 20:50:30.012198+00');


--
-- Data for Name: comment_votes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.comment_votes (user_id, comment_id, value, created_at) VALUES ('38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '2aa217df-f5f8-4a3c-9826-5901b841daee', 1, '2026-11-03 20:50:34.264963+00');
INSERT INTO public.comment_votes (user_id, comment_id, value, created_at) VALUES ('3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '6486e61b-7a4e-4fdc-bac8-4f07c412b665', 1, '2026-11-03 20:50:34.33613+00');
INSERT INTO public.comment_votes (user_id, comment_id, value, created_at) VALUES ('3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '26221a23-d97d-4502-9a87-b19d8e027692', -1, '2026-11-03 20:50:34.393506+00');


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('2aa217df-f5f8-4a3c-9826-5901b841daee', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '6486e61b-7a4e-4fdc-bac8-4f07c412b665', 'Спасибо! Диацетиловую паузу не пропускай.', '2026-11-03 20:50:33.23824+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('c5551a13-03c7-4ae8-b895-c326326a9ae2', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '6486e61b-7a4e-4fdc-bac8-4f07c412b665', 'Не пропущу. А сухое охмеление — на 5-й день?', '2026-11-03 20:50:33.322038+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('6486e61b-7a4e-4fdc-bac8-4f07c412b665', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', NULL, 'Отличный рецепт, сварил — вышло очень чисто.', '2026-11-03 20:50:33.160651+00', '2026-11-03 20:50:33.39246+00', NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('f8186764-efd8-4665-8b91-398f140355e3', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '22c84765-56d6-45ec-a7b4-d688532f3e16', 'Ответ на тот, что удалят.', '2026-11-03 20:50:33.837597+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('22c84765-56d6-45ec-a7b4-d688532f3e16', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', NULL, '', '2026-11-03 20:50:33.549622+00', NULL, '2026-11-03 20:50:33.993708+00');
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('48a57960-b422-4b1a-9eaa-053f29f00f08', '0304ef1c-59d3-4201-b479-bf0b47b02587', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', NULL, 'Интересное пшеничное.', '2026-11-03 20:50:34.177449+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('26221a23-d97d-4502-9a87-b19d8e027692', '0304ef1c-59d3-4201-b479-bf0b47b02587', '0261cc99-6dc7-4db2-aff2-e5793d925b06', NULL, 'А дрожжи можно заменить?', '2026-11-03 20:50:34.229801+00', NULL, NULL);


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.devices (id, user_id, tuya_id, name, model, created_at, agent_id, limits) VALUES ('95f5c2f2-8027-479f-a962-0baa02581939', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'fixture-easybrew-1', 'Easy Brew 40', 'easybrew40', '2026-11-03 20:50:34.87485+00', 'c0ef5719-f1a9-45f9-81b6-20fa44e6fde1', '{"maxTemp": 100.0, "minTemp": 20.0, "boilTemp": 100.1, "maxSteps": 9, "maxWatts": 3500, "minWatts": 500, "wattsStep": 100, "maxAdditions": 9}');


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('82ff7ebb-8a0f-48ff-b524-d444f28478c7', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Easy Brew 40', 'easybrew', '95f5c2f2-8027-479f-a962-0baa02581939', NULL, 75, 3, true, '2026-11-03 20:50:34.894805+00', NULL, '{}', NULL);
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('555932ec-3d15-4be9-ad51-2dac44dab940', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Кастрюля 30 л', 'manual', NULL, 30, 70, 3.5, false, '2026-11-03 20:50:34.962661+00', 35, '{}', 'запасная');
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('ece408b3-cdb5-4c01-9966-0aa19210f8ce', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'ЦКТ 32 л', 'fermenter', NULL, NULL, NULL, NULL, false, '2026-11-03 20:50:35.061189+00', NULL, '{"volume": 32.0}', NULL);
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('c6bc5635-8abc-446d-bca0-489a2f70bad8', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'Котёл читателя', 'manual', NULL, 20, 72, 3, true, '2026-11-03 20:50:35.136622+00', NULL, '{}', NULL);
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('8f13d55a-f0db-4747-a36b-b6f8d417bb55', '5152ae85-a0a5-4e21-9cba-f597a617f3e1', 'Кастрюля до входа', 'manual', NULL, 25, NULL, NULL, true, '2026-11-03 20:50:39.868907+00', NULL, '{}', NULL);


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (1, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:50:30.012198+00', 'start', 'Программа запущена', '{"step": 0, "temp": 50.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (2, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:05:30.012198+00', 'step', 'Шаг 1: Белковая', '{"step": 1, "temp": 51.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (3, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:20:30.012198+00', 'alert', 'Засыпьте солод', '{"step": 2, "temp": 52.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (4, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:35:30.012198+00', 'addition', 'Хмель Saaz 60 г', '{"step": 3, "temp": 53.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (5, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:50:30.012198+00', 'end', 'Программа закончена', '{"step": 4, "temp": 54.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (6, '95f5c2f2-8027-479f-a962-0baa02581939', NULL, '2026-11-01 20:50:30.012198+00', 'info', 'Агент подключился', 'null');


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.favorites (user_id, recipe_id, created_at) VALUES ('38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '2026-11-03 20:50:32.594517+00');
INSERT INTO public.favorites (user_id, recipe_id, created_at) VALUES ('3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '2026-11-03 20:50:32.693348+00');
INSERT INTO public.favorites (user_id, recipe_id, created_at) VALUES ('3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '0304ef1c-59d3-4201-b479-bf0b47b02587', '2026-11-03 20:50:32.739087+00');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('b0cf5e5c-e801-4da9-93a3-eaa3e913ab71', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'comment', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '6486e61b-7a4e-4fdc-bac8-4f07c412b665', '2026-11-03 20:50:33.164697+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('7b6fa294-c62b-4490-939b-eaa22ecf2d6a', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'reply', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', 'c5551a13-03c7-4ae8-b895-c326326a9ae2', '2026-11-03 20:50:33.327109+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('35fba161-bd0e-4eee-a4d1-355f4f4bb2ab', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'reply', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', 'f8186764-efd8-4665-8b91-398f140355e3', '2026-11-03 20:50:33.845396+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('c37be841-eab7-4b3b-84f1-bfefd037d1c3', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'comment', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '0304ef1c-59d3-4201-b479-bf0b47b02587', '48a57960-b422-4b1a-9eaa-053f29f00f08', '2026-11-03 20:50:34.186079+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('e1a99c4d-7642-4daa-8f43-7ae036e9c4fe', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'comment', '0261cc99-6dc7-4db2-aff2-e5793d925b06', '0304ef1c-59d3-4201-b479-bf0b47b02587', '26221a23-d97d-4502-9a87-b19d8e027692', '2026-11-03 20:50:34.231877+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('7fc76758-0813-4b3a-871d-34616c28125f', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'reply', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '2aa217df-f5f8-4a3c-9826-5901b841daee', '2026-11-03 20:50:33.241973+00', '2026-11-03 20:50:34.746296+00', NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('d2e4844e-15a7-4dac-a579-ee23da208609', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'brew', NULL, NULL, NULL, '2026-11-03 20:50:36.317543+00', NULL, '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '{"text": "«Основное» по прикидке подходит к концу — до 1,021 (5,2 °P)", "title": "Пора замерить плотность"}');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('b08bf182-efe4-45fd-a678-0eb46b599590', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'brew', NULL, NULL, NULL, '2026-11-03 20:50:36.317832+00', NULL, '66ddb304-02ce-42ce-9eab-0120f691c0eb', '{"text": "Saaz 20 г", "title": "Сухое охмеление"}');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('04fe3a99-d127-47be-97fd-5da906a78d36', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'brew', NULL, NULL, NULL, '2026-11-03 20:50:36.352187+00', NULL, '7fb9548d-a6cf-489e-adc0-79d8ac97a563', '{"text": "«Основное» по прикидке подходит к концу — до 1,021 (5,2 °P)", "title": "Пора замерить плотность"}');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('6610343e-6957-48f4-86ed-55a754057711', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'brew', NULL, NULL, NULL, '2026-11-03 20:50:36.352352+00', NULL, '66ddb304-02ce-42ce-9eab-0120f691c0eb', '{"text": "«Основное» по прикидке подходит к концу — до 1,020 (5,1 °P)", "title": "Пора замерить плотность"}');


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at) VALUES ('f0bcbb97-8253-4043-b255-f02c62eeba4b', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'https://fcm.googleapis.com/fcm/send/fixture-admin', 'p256dh-admin-test', 'auth-admin-test', 'Fixture Chrome', '2026-11-03 20:50:39.844019+00', '2026-11-03 20:50:39.844236+00');
INSERT INTO public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at) VALUES ('8bbc514e-96a5-4859-bb00-40e754b5d6c9', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'https://fcm.googleapis.com/fcm/send/fixture-reader', 'p256dh-reader-test', 'auth-reader-test', NULL, '2026-11-03 20:50:39.85781+00', '2026-11-03 20:50:39.857963+00');


--
-- Data for Name: readings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (1, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:50:30.012198+00', 20, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (2, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:51:30.012198+00', 21.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (3, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:52:30.012198+00', 22.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (4, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:53:30.012198+00', 24.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (5, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:54:30.012198+00', 25.6, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (6, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:55:30.012198+00', 27, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (7, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:56:30.012198+00', 28.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (8, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:57:30.012198+00', 29.799999999999997, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (9, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:58:30.012198+00', 31.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (10, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 20:59:30.012198+00', 32.6, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (11, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:00:30.012198+00', 34, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (12, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:01:30.012198+00', 35.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (13, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:02:30.012198+00', 36.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (14, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:03:30.012198+00', 38.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (15, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:04:30.012198+00', 39.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (16, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:05:30.012198+00', 41, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (17, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:06:30.012198+00', 42.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (18, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:07:30.012198+00', 43.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (19, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:08:30.012198+00', 45.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (20, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:09:30.012198+00', 46.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (21, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:10:30.012198+00', 48, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (22, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:11:30.012198+00', 49.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (23, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:12:30.012198+00', 50.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (24, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:13:30.012198+00', 52.199999999999996, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (25, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:14:30.012198+00', 53.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (26, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:15:30.012198+00', 55, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (27, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:16:30.012198+00', 56.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (28, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:17:30.012198+00', 57.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (29, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:18:30.012198+00', 59.199999999999996, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (30, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:19:30.012198+00', 60.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (31, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:20:30.012198+00', 62, NULL, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (32, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:21:30.012198+00', 63.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (33, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:22:30.012198+00', 64.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (34, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:23:30.012198+00', 66.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (35, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:24:30.012198+00', 67.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (36, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:25:30.012198+00', 69, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (37, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:26:30.012198+00', 70.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (38, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:27:30.012198+00', 71.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (39, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:28:30.012198+00', 73.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (40, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:29:30.012198+00', 74.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (41, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:30:30.012198+00', 76, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (42, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:31:30.012198+00', 77.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (43, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:32:30.012198+00', 78.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (44, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:33:30.012198+00', 80.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (45, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:34:30.012198+00', 81.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (46, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:35:30.012198+00', 83, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (47, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:36:30.012198+00', 84.39999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (48, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:37:30.012198+00', 85.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (49, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:38:30.012198+00', 87.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (50, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:39:30.012198+00', 88.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (51, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:40:30.012198+00', 20, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (52, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:41:30.012198+00', 21.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (53, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:42:30.012198+00', 22.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (54, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:43:30.012198+00', 24.2, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (55, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:44:30.012198+00', 25.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (56, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:45:30.012198+00', 27, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (57, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:46:30.012198+00', 28.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (58, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:47:30.012198+00', 29.799999999999997, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (59, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:48:30.012198+00', 31.2, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (60, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:49:30.012198+00', 32.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (61, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:50:30.012198+00', 34, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (62, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:51:30.012198+00', 35.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (63, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:52:30.012198+00', 36.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (64, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:53:30.012198+00', 38.2, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (65, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:54:30.012198+00', 39.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (66, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:55:30.012198+00', 41, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (67, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:56:30.012198+00', 42.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (68, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:57:30.012198+00', 43.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (69, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:58:30.012198+00', 45.2, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (70, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 21:59:30.012198+00', 46.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (71, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:00:30.012198+00', 48, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (72, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:01:30.012198+00', 49.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (73, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:02:30.012198+00', 50.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (74, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:03:30.012198+00', 52.199999999999996, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (75, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:04:30.012198+00', 53.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (76, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:05:30.012198+00', 55, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (77, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:06:30.012198+00', 56.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (78, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:07:30.012198+00', 57.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (79, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:08:30.012198+00', 59.199999999999996, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (80, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:09:30.012198+00', 60.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (81, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:10:30.012198+00', 62, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (82, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:11:30.012198+00', 63.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (83, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:12:30.012198+00', 64.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (84, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:13:30.012198+00', 66.19999999999999, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (85, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:14:30.012198+00', 67.6, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (86, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:15:30.012198+00', 69, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (87, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:16:30.012198+00', 70.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (88, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:17:30.012198+00', 71.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (89, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:18:30.012198+00', 73.19999999999999, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (90, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:19:30.012198+00', 74.6, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (91, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:20:30.012198+00', 76, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (92, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:21:30.012198+00', 77.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (93, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:22:30.012198+00', 78.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (94, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:23:30.012198+00', 80.19999999999999, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (95, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:24:30.012198+00', 81.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (96, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:25:30.012198+00', 83, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (97, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:26:30.012198+00', 84.39999999999999, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (98, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:27:30.012198+00', 85.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (99, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:28:30.012198+00', 87.19999999999999, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (100, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:29:30.012198+00', 88.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (101, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:30:30.012198+00', 20, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (102, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:31:30.012198+00', 21.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (103, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:32:30.012198+00', 22.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (104, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:33:30.012198+00', 24.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (105, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:34:30.012198+00', 25.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (106, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:35:30.012198+00', 27, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (107, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:36:30.012198+00', 28.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (108, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:37:30.012198+00', 29.799999999999997, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (109, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:38:30.012198+00', 31.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (110, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:39:30.012198+00', 32.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (111, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:40:30.012198+00', 34, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (112, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:41:30.012198+00', 35.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (113, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:42:30.012198+00', 36.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (114, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:43:30.012198+00', 38.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (115, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:44:30.012198+00', 39.599999999999994, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (116, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:45:30.012198+00', 41, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (117, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:46:30.012198+00', 42.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (118, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:47:30.012198+00', 43.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (119, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:48:30.012198+00', 45.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (120, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:49:30.012198+00', 46.599999999999994, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (121, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:50:30.012198+00', 48, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (122, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:51:30.012198+00', 49.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (123, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:52:30.012198+00', 50.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (124, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:53:30.012198+00', 52.199999999999996, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (125, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:54:30.012198+00', 53.599999999999994, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (126, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:55:30.012198+00', 55, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (127, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:56:30.012198+00', 56.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (128, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:57:30.012198+00', 57.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (129, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:58:30.012198+00', 59.199999999999996, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (130, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 22:59:30.012198+00', 60.599999999999994, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (131, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:00:30.012198+00', 62, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (132, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:01:30.012198+00', 63.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (133, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:02:30.012198+00', 64.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (134, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:03:30.012198+00', 66.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (135, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:04:30.012198+00', 67.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (136, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:05:30.012198+00', 69, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (137, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:06:30.012198+00', 70.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (138, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:07:30.012198+00', 71.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (139, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:08:30.012198+00', 73.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (140, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:09:30.012198+00', 74.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (141, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:10:30.012198+00', 76, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (142, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:11:30.012198+00', 77.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (143, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:12:30.012198+00', 78.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (144, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:13:30.012198+00', 80.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (145, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:14:30.012198+00', 81.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (146, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:15:30.012198+00', 83, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (147, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:16:30.012198+00', 84.39999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (148, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:17:30.012198+00', 85.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (149, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:18:30.012198+00', 87.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (150, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:19:30.012198+00', 88.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (151, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:20:30.012198+00', 20, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (152, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:21:30.012198+00', 21.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (153, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:22:30.012198+00', 22.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (154, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:23:30.012198+00', 24.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (155, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:24:30.012198+00', 25.6, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (156, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:25:30.012198+00', 27, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (157, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:26:30.012198+00', 28.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (158, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:27:30.012198+00', 29.799999999999997, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (159, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:28:30.012198+00', 31.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (160, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:29:30.012198+00', 32.6, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (161, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:30:30.012198+00', 34, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (162, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:31:30.012198+00', 35.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (163, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:32:30.012198+00', 36.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (164, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:33:30.012198+00', 38.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (165, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:34:30.012198+00', 39.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (166, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:35:30.012198+00', 41, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (167, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:36:30.012198+00', 42.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (168, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:37:30.012198+00', 43.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (169, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:38:30.012198+00', 45.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (170, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:39:30.012198+00', 46.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (171, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:40:30.012198+00', 48, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (172, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:41:30.012198+00', 49.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (173, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:42:30.012198+00', 50.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (174, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:43:30.012198+00', 52.199999999999996, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (175, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:44:30.012198+00', 53.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (176, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:45:30.012198+00', 55, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (177, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:46:30.012198+00', 56.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (178, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:47:30.012198+00', 57.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (179, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:48:30.012198+00', 59.199999999999996, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (180, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:49:30.012198+00', 60.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (181, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:50:30.012198+00', 62, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (182, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:51:30.012198+00', 63.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (183, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:52:30.012198+00', 64.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (184, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:53:30.012198+00', 66.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (185, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:54:30.012198+00', 67.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (186, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:55:30.012198+00', 69, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (187, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:56:30.012198+00', 70.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (188, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:57:30.012198+00', 71.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (189, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:58:30.012198+00', 73.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (190, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-25 23:59:30.012198+00', 74.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (191, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:00:30.012198+00', 76, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (192, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:01:30.012198+00', 77.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (193, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:02:30.012198+00', 78.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (194, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:03:30.012198+00', 80.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (195, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:04:30.012198+00', 81.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (196, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:05:30.012198+00', 83, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (197, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:06:30.012198+00', 84.39999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (198, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:07:30.012198+00', 85.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (199, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:08:30.012198+00', 87.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (200, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:09:30.012198+00', 88.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (201, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:10:30.012198+00', 20, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (202, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:11:30.012198+00', 21.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (203, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:12:30.012198+00', 22.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (204, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:13:30.012198+00', 24.2, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (205, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:14:30.012198+00', 25.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (206, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:15:30.012198+00', 27, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (207, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:16:30.012198+00', 28.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (208, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:17:30.012198+00', 29.799999999999997, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (209, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:18:30.012198+00', 31.2, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (210, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:19:30.012198+00', 32.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (211, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:20:30.012198+00', 34, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (212, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:21:30.012198+00', 35.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (213, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:22:30.012198+00', 36.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (214, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:23:30.012198+00', 38.2, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (215, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:24:30.012198+00', 39.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (216, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:25:30.012198+00', 41, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (217, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:26:30.012198+00', 42.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (218, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:27:30.012198+00', 43.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (219, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:28:30.012198+00', 45.2, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (220, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:29:30.012198+00', 46.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (221, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:30:30.012198+00', 48, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (222, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:31:30.012198+00', 49.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (223, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:32:30.012198+00', 50.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (224, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:33:30.012198+00', 52.199999999999996, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (225, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:34:30.012198+00', 53.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (226, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:35:30.012198+00', 55, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (227, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:36:30.012198+00', 56.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (228, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:37:30.012198+00', 57.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (229, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:38:30.012198+00', 59.199999999999996, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (230, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:39:30.012198+00', 60.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (231, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:40:30.012198+00', 62, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (232, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:41:30.012198+00', 63.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (233, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:42:30.012198+00', 64.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (234, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:43:30.012198+00', 66.19999999999999, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (235, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:44:30.012198+00', 67.6, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (236, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:45:30.012198+00', 69, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (237, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:46:30.012198+00', 70.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (238, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:47:30.012198+00', 71.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (239, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:48:30.012198+00', 73.19999999999999, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (240, '95f5c2f2-8027-479f-a962-0baa02581939', 'b13bc5a2-9522-492d-8ddb-9777e1b101eb', '2026-10-26 00:49:30.012198+00', 74.6, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (241, '95f5c2f2-8027-479f-a962-0baa02581939', NULL, '2026-11-01 20:50:30.012198+00', 18.75, NULL, NULL, NULL);


--
-- Data for Name: recipe_photos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('57a13861-b525-4a07-8cbb-86c4eecb29e6', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'image/png', '\x89504e470d0a1a0a0000000d4948445200000280000001e00802000000bab34bb30000076749444154789cedd73111c03010c4403bb8823d708c232c5e8577095ca9b97dbe770100b39ee13d00408001a0e10103404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c00020c0077f080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003800003c01d3c6000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c006bde0f2f3605a032f90e4d0000000049454e44ae426082', NULL, '2026-11-03 20:50:32.319327+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc0001108016801e003012200021101031101ffc4001500010100000000000000000000000000000007ffc40014100100000000000000000000000000000000ffc400160101010100000000000000000000000000000607ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00a780cb546000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffd9');
INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('04d6ae74-5cad-43b0-bbe0-c515c1b7c057', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'image/png', '\x89504e470d0a1a0a0000000d49484452000003200000025808020000001514152700000aad49444154789cedd831110021100441783548441802dfc40417740bd8786af7bb670100d0f9c22d000004160040cf8305001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000020b0060360f1600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100082c0080d93c580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000020b0060360f1600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600c06afd9c9b06042df50dfa0000000049454e44ae426082', 'Фото автора, CC-BY', '2026-11-03 20:50:32.361994+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc0001108016801e003012200021101031101ffc4001500010100000000000000000000000000000001ffc40014100100000000000000000000000000000000ffc4001501010100000000000000000000000000000006ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00a021954000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffd9');
INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('51cae5a8-3469-459d-9f83-e5b6d8ef3dbc', 'eb5387dc-1307-4308-88a2-b5e84ff5967f', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'image/png', '\x89504e470d0a1a0a0000000d4948445200000140000000f00802000000fe4f2a3c000002d649444154789cedd3410dc02000c040981094a004ff42e6810f6972a7a09fceb3d7009abed701c03d0343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc010666008333084191846d70ff44b029450487d700000000049454e44ae426082', NULL, '2026-11-03 20:50:32.489442+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc000110800f0014003012200021101031101ffc4001500010100000000000000000000000000000007ffc40014100100000000000000000000000000000000ffc4001501010100000000000000000000000000000005ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00960090a6000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fffd9');
INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('1c3fb7c5-9ba3-4a98-b0c3-04f6ccaae352', '0304ef1c-59d3-4201-b479-bf0b47b02587', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'image/png', '\x89504e470d0a1a0a0000000d49484452000001e0000001e00802000000f2b629c2000006b249444154789cedd43101c02000c030986ac422020933c04f8f4441afceb3d700a0e77b1d00c09d410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934c068fa018d900604a5eb4fa80000000049454e44ae426082', NULL, '2026-11-03 20:50:32.547518+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc000110801e001e003012200021101031101ffc4001500010100000000000000000000000000000007ffc40014100100000000000000000000000000000000ffc400160101010100000000000000000000000000000506ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00ba00c12a8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003ffd9');


--
-- Data for Name: recipe_votes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipe_votes (user_id, recipe_id, value, created_at) VALUES ('38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', 1, '2026-11-03 20:50:32.758791+00');
INSERT INTO public.recipe_votes (user_id, recipe_id, value, created_at) VALUES ('0261cc99-6dc7-4db2-aff2-e5793d925b06', '57cec314-0e32-4747-bfb5-5b2e7bc2671e', -1, '2026-11-03 20:50:32.791882+00');
INSERT INTO public.recipe_votes (user_id, recipe_id, value, created_at) VALUES ('3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '0304ef1c-59d3-4201-b479-bf0b47b02587', 1, '2026-11-03 20:50:33.033121+00');


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('57cec314-0e32-4747-bfb5-5b2e7bc2671e', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Чешский пилснер', '2026-11-03 20:50:31.963853+00', '2026-11-03 20:50:31.964076+00', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 60.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 30.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 30.0, "efficiency": 83.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1.0, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 2.5, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 3.0, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2.0, "attenuation": 80.0}], "targets": {"fg": 1.0095016886763684, "og": 1.047508443381842, "abv": 5.053472212778213, "ebc": 9.60857114958257, "ibu": 21.974357783061897}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 5.3}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.3}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', 'public', '2026-11-03 20:50:32.129649+00');
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('eb5387dc-1307-4308-88a2-b5e84ff5967f', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Личный: короткая программа', '2026-11-03 20:50:32.194149+00', '2026-11-03 20:50:32.194225+00', '{"boil": {"minutes": 30}, "hops": [{"use": "boil", "name": "Test", "amount": 10.0, "minutes": 5}], "mash": [{"name": "Пауза", "temp": 65.0, "minutes": 30}], "name": "Личный: короткая программа", "batch": {}, "miscs": [], "notes": "", "water": {"source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": []}, "yeasts": [], "targets": {}, "fermentables": [], "fermentation": []}', 'private', NULL);
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('0304ef1c-59d3-4201-b479-bf0b47b02587', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'Светлое пшеничное', '2026-11-03 20:50:32.221667+00', '2026-11-03 20:50:32.221733+00', '{"boil": {"minutes": 60}, "hops": [{"use": "boil", "name": "Hallertau", "alpha": 4.0, "amount": 25.0, "minutes": 60}], "mash": [{"name": "Осахаривание", "temp": 66.0, "minutes": 60}], "name": "Светлое пшеничное", "batch": {"volume": 25.0, "efficiency": 75.0}, "miscs": [], "notes": "", "water": {"source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": []}, "yeasts": [{"form": "dry", "name": "WB-06", "unit": "pkg", "attenuation": 78.0}], "targets": {"fg": 1.0101545640189333, "og": 1.04615710917697, "abv": 4.781202233110925, "ebc": 6.6420900653978086, "ibu": 9.550785786486495}, "fermentables": [{"ebc": 4.0, "use": "mash", "kind": "grain", "name": "Wheat Blanc", "amount": 2.5}, {"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 2.5}], "fermentation": [{"days": 0, "name": "Брожение", "temp": 20.0, "until": "fg"}]}', 'public', '2026-11-03 20:50:32.244667+00');
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('db3313d5-f3ee-48b9-a7bc-32a3acaafcda', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'Черновик читателя', '2026-11-03 20:50:32.28365+00', '2026-11-03 20:50:32.28376+00', '{"hops": [], "mash": [], "name": "Черновик читателя", "batch": {}, "miscs": [], "notes": "", "water": {"source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": []}, "yeasts": [], "targets": {}, "fermentables": [], "fermentation": []}', 'private', NULL);
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('f12ab428-e97a-4cc1-8a21-82c015cd2ea5', '5152ae85-a0a5-4e21-9cba-f597a617f3e1', 'Рецепт до входа', '2026-11-03 20:50:39.868594+00', '2026-11-03 20:50:39.868608+00', '{"name": "Рецепт до входа", "notes": "заведён без входа"}', 'private', NULL);


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('c8dd9ffc-ec08-484e-86aa-414348810713', '3900e1f5-9f15-470b-a7fe-a0442a74ad3d', '354f94c18f2440a3185be76cba1ee899126002947814e3c3051da0b1cc31bf64', 'Python-urllib/3.13', '2026-11-03 20:50:30.334146+00', '2026-11-03 20:50:30.334161+00', '2026-12-03 20:50:30.333907+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('4d4ae399-4138-4783-bc2d-c35446c906ce', '0261cc99-6dc7-4db2-aff2-e5793d925b06', '89a281b28d8d242ffb7221f061de953ad3756dd269484b2ae2f69e47001f00a5', 'Python-urllib/3.13', '2026-11-03 20:50:31.208657+00', '2026-11-03 20:50:31.208665+00', '2026-12-03 20:50:31.208538+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('862908c6-5bc6-4658-8b71-a2478efb9520', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '6add9839373c1d74971ce2422a04f87bb9cdaafbccd185717dc4b10ffcac0102', 'Python-urllib/3.13', '2026-11-03 20:50:31.461432+00', '2026-11-03 20:50:31.461442+00', '2026-12-03 20:50:31.461285+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('87e670f1-3449-49d1-a721-f8b9fcdc6799', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'fc9410cdade936707f527ea9fb1f14b3deeed85407796f50397c1c658679ec52', 'Python-urllib/3.13', '2026-11-03 20:50:31.732899+00', '2026-11-03 20:50:31.732907+00', '2026-12-03 20:50:31.732758+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('20320a77-bec4-48a8-924c-f88f188db652', '38c3ea21-6f8b-4177-ab96-92da25b0ee6a', '0000000000000000000000000000000000000000000000000000000000000001', 'Старый браузер', '2026-09-04 20:50:30.012198+00', '2026-09-19 20:50:30.012198+00', '2026-10-19 20:50:30.012198+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('0261cc99-6dc7-4db2-aff2-e5793d925b06', 'Новичок', 'unverified@fixture.test', '2026-11-03 20:50:31.113894+00', 'scrypt$16384$8$1$xhCCDSP75xgz0KoDX0DYSw$ZjlZkDBdX9v8w3Ly3RiM2QiXJJEjvLaf5w9v210DCYE', NULL, 'user', 'новичок', NULL, 0, true, true);
INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('3900e1f5-9f15-470b-a7fe-a0442a74ad3d', 'Хмелевар', 'admin@fixture.test', '2026-11-03 20:50:30.235127+00', 'scrypt$16384$8$1$opou_AsCdBHnAK6gNB7rGg$8DToQIupDA6srGjUUhWGpUjtKGGapgpaenCF34zEnZk', '2026-11-03 20:50:30.542278+00', 'admin', 'хмелевар', '\xffd8ffe000104a46494600010100000100010000ffdb0043000503040404030504040405050506070c08070707070f0b0b090c110f1212110f111113161c1713141a1511111821181a1d1d1f1f1f13172224221e241c1e1f1effdb0043010505050706070e08080e1e1411141e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1effc00011080100010003012200021101031101ffc4001500010100000000000000000000000000000005ffc40014100100000000000000000000000000000000ffc400160101010100000000000000000000000000000607ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00b603175f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003ffd9', 1, true, true);
INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('38c3ea21-6f8b-4177-ab96-92da25b0ee6a', 'Читатель', 'reader@fixture.test', '2026-11-03 20:50:30.637083+00', 'scrypt$16384$8$1$E3RQc5OigbXTvalRe202rQ$FSr2F0NrHyWFqEH1E_BcGuV_R7V765DdwCwqBc4AYOE', '2026-11-03 20:50:30.899336+00', 'user', 'читатель', NULL, 0, true, false);
INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('5152ae85-a0a5-4e21-9cba-f597a617f3e1', NULL, NULL, '2026-11-03 20:50:39.863541+00', NULL, NULL, 'user', NULL, NULL, 0, true, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.events_id_seq', 6, true);


--
-- Name: readings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.readings_id_seq', 241, true);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: agents agents_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_token_hash_key UNIQUE (token_hash);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: brew_entries brew_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brew_entries
    ADD CONSTRAINT brew_entries_pkey PRIMARY KEY (id);


--
-- Name: brews brews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brews
    ADD CONSTRAINT brews_pkey PRIMARY KEY (id);


--
-- Name: comment_votes comment_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_pkey PRIMARY KEY (user_id, comment_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: devices devices_tuya_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_tuya_id_key UNIQUE (tuya_id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, recipe_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: readings readings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readings
    ADD CONSTRAINT readings_pkey PRIMARY KEY (id);


--
-- Name: recipe_photos recipe_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_photos
    ADD CONSTRAINT recipe_photos_pkey PRIMARY KEY (id);


--
-- Name: recipe_votes recipe_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_votes
    ADD CONSTRAINT recipe_votes_pkey PRIMARY KEY (user_id, recipe_id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_name_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_name_key_key UNIQUE (name_key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_agents_user_id ON public.agents USING btree (user_id);


--
-- Name: ix_auth_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_auth_tokens_user_id ON public.auth_tokens USING btree (user_id);


--
-- Name: ix_brew_entries_brew_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brew_entries_brew_id ON public.brew_entries USING btree (brew_id);


--
-- Name: ix_brews_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brews_device_id ON public.brews USING btree (device_id);


--
-- Name: ix_brews_equipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brews_equipment_id ON public.brews USING btree (equipment_id);


--
-- Name: ix_brews_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brews_recipe_id ON public.brews USING btree (recipe_id);


--
-- Name: ix_brews_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brews_started_at ON public.brews USING btree (started_at);


--
-- Name: ix_brews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brews_user_id ON public.brews USING btree (user_id);


--
-- Name: ix_comment_votes_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_votes_comment_id ON public.comment_votes USING btree (comment_id);


--
-- Name: ix_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_parent_id ON public.comments USING btree (parent_id);


--
-- Name: ix_comments_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_recipe_id ON public.comments USING btree (recipe_id);


--
-- Name: ix_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_user_id ON public.comments USING btree (user_id);


--
-- Name: ix_devices_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_devices_agent_id ON public.devices USING btree (agent_id);


--
-- Name: ix_devices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_devices_user_id ON public.devices USING btree (user_id);


--
-- Name: ix_equipment_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_equipment_device_id ON public.equipment USING btree (device_id);


--
-- Name: ix_equipment_one_main; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_equipment_one_main ON public.equipment USING btree (user_id) WHERE main;


--
-- Name: ix_equipment_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_equipment_user_id ON public.equipment USING btree (user_id);


--
-- Name: ix_events_brew_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events_brew_id ON public.events USING btree (brew_id);


--
-- Name: ix_events_device_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events_device_at ON public.events USING btree (device_id, at);


--
-- Name: ix_favorites_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_favorites_recipe_id ON public.favorites USING btree (recipe_id);


--
-- Name: ix_notifications_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_actor_id ON public.notifications USING btree (actor_id);


--
-- Name: ix_notifications_brew_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_brew_id ON public.notifications USING btree (brew_id);


--
-- Name: ix_notifications_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_comment_id ON public.notifications USING btree (comment_id);


--
-- Name: ix_notifications_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_recipe_id ON public.notifications USING btree (recipe_id);


--
-- Name: ix_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_created ON public.notifications USING btree (user_id, created_at);


--
-- Name: ix_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: ix_readings_brew_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_readings_brew_id ON public.readings USING btree (brew_id);


--
-- Name: ix_readings_device_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_readings_device_at ON public.readings USING btree (device_id, at);


--
-- Name: ix_recipe_photos_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recipe_photos_recipe_id ON public.recipe_photos USING btree (recipe_id);


--
-- Name: ix_recipe_photos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recipe_photos_user_id ON public.recipe_photos USING btree (user_id);


--
-- Name: ix_recipe_votes_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recipe_votes_recipe_id ON public.recipe_votes USING btree (recipe_id);


--
-- Name: ix_recipes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recipes_user_id ON public.recipes USING btree (user_id);


--
-- Name: ix_recipes_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recipes_visibility ON public.recipes USING btree (visibility);


--
-- Name: ix_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: brew_entries brew_entries_brew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brew_entries
    ADD CONSTRAINT brew_entries_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES public.brews(id) ON DELETE CASCADE;


--
-- Name: brews brews_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brews
    ADD CONSTRAINT brews_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: brews brews_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brews
    ADD CONSTRAINT brews_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE SET NULL;


--
-- Name: brews brews_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brews
    ADD CONSTRAINT brews_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: brews brews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brews
    ADD CONSTRAINT brews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comment_votes comment_votes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_votes comment_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: devices devices_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: devices devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: equipment equipment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_brew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES public.brews(id) ON DELETE CASCADE;


--
-- Name: events events_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_brew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES public.brews(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: readings readings_brew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readings
    ADD CONSTRAINT readings_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES public.brews(id) ON DELETE CASCADE;


--
-- Name: readings readings_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readings
    ADD CONSTRAINT readings_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: recipe_photos recipe_photos_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_photos
    ADD CONSTRAINT recipe_photos_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_photos recipe_photos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_photos
    ADD CONSTRAINT recipe_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recipe_votes recipe_votes_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_votes
    ADD CONSTRAINT recipe_votes_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_votes recipe_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_votes
    ADD CONSTRAINT recipe_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


