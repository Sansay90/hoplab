--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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

INSERT INTO public.agents (id, user_id, name, token_hash, created_at, last_seen_at) VALUES ('9d0b55aa-2de7-467a-b30b-38a9e953b053', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'Запасной агент', '84ad7af27a6ef65b3313c65d206c5770e15d7a20c6c910480642fdb7ff058080', '2026-11-03 21:23:18.208707+00', NULL);
INSERT INTO public.agents (id, user_id, name, token_hash, created_at, last_seen_at) VALUES ('eb463948-0d61-4245-8a24-07e2f440ee5d', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'Агент дома', 'fec6a1c607334a0e7235f01fc05891834d070795f9fe1b247bc5714c314bb093', '2026-11-03 21:23:18.199755+00', '2026-11-03 21:23:18.226854+00');


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.alembic_version (version_num) VALUES ('c4e6a8b2d9f7');


--
-- Data for Name: auth_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('36af7999-a534-4f94-8763-53731a59732f', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'verify', '023e8544334e7a26ac351a26b92890d566a8041a318d227a159b4bda0ce32754', '2026-11-03 21:23:15.300899+00', '2026-11-05 21:23:15.300795+00', '2026-11-03 21:23:15.316548+00');
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('bf24d4b7-7d61-444c-b4b0-482bf94fa29c', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'verify', 'af0fcaf371ea8f6f6ec532044081385c9105cf0c6dc5517eb4fe0e8989707d78', '2026-11-03 21:23:15.483723+00', '2026-11-05 21:23:15.483598+00', '2026-11-03 21:23:15.499697+00');
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('a4a06d7e-2504-4e09-a643-c7522d5de42b', '13b02777-ec06-4c95-b9d8-2b141f41fae7', 'verify', 'd3931b0b34e094c716786a6e3e1093aabee2b15f1f78dc9a4e45b2c3dbc6942a', '2026-11-03 21:23:15.628013+00', '2026-11-05 21:23:15.627917+00', NULL);
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('c6f20aa2-706c-4a4c-8dd8-bc3bb637b4dd', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'reset', '2fc7d764f5b89a979de33811479232928a04393612d3b647903ed6637bd047f0', '2026-11-03 21:23:15.66424+00', '2026-11-03 22:23:15.664142+00', '2026-11-03 21:23:15.69558+00');
INSERT INTO public.auth_tokens (id, user_id, kind, token_hash, created_at, expires_at, used_at) VALUES ('45851a38-214d-4ce7-8c17-53918b14e4ca', '13b02777-ec06-4c95-b9d8-2b141f41fae7', 'reset', 'fc3867a5c85701d0f42b1ee3749b22770b91bbdb2ef25a9e3cd466459185e164', '2026-11-03 21:23:15.881739+00', '2026-11-03 22:23:15.881611+00', NULL);


--
-- Data for Name: brew_entries; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('37291197-4a0c-41a0-bf0d-569728cc5e40', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-24 21:23:15.107563+00', 'mash_temp', 65.2, NULL, '2026-11-03 21:23:19.04621+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('d773d0a4-7eb8-4578-9a3c-5eabf9fcb183', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-24 22:23:15.107563+00', 'og', 1.049, NULL, '2026-11-03 21:23:19.082071+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('f9e83bee-4de3-4f49-b5e4-a030dc4a8ac2', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-24 23:23:15.107563+00', 'pitch', NULL, NULL, '2026-11-03 21:23:19.109458+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('936647df-5fe6-46a2-abc9-cb415033ebcc', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-24 23:24:15.107563+00', 'pitch_temp', 12.5, NULL, '2026-11-03 21:23:19.139017+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('53cfb8d3-2eb0-4f70-9d64-508bb130e4a9', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-27 21:23:15.107563+00', 'gravity', 1.032, NULL, '2026-11-03 21:23:19.217659+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('f9c36b5f-27b5-45ec-baf0-704bc8992628', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-28 21:23:15.107563+00', 'note', NULL, 'Кружение на ночь', '2026-11-03 21:23:19.284148+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('fd22cc76-c1d8-4a85-96ab-8b13277eb1a8', 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '2026-10-30 21:23:15.107563+00', 'gravity', 1.021, NULL, '2026-11-03 21:23:19.339894+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('23439f91-38e6-4dd0-b637-61f891e9c5bc', '491cb66c-d8a7-4199-8b77-2816fa3812ab', '2026-11-03 21:22:15.107563+00', 'pitch', NULL, NULL, '2026-11-03 21:23:19.540221+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('ed0f282c-6a9e-451f-907d-e40f2904f6b1', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 02:23:15.107563+00', 'pitch', NULL, NULL, '2026-11-03 21:23:22.053404+00');
INSERT INTO public.brew_entries (id, brew_id, at, kind, value, text, created_at) VALUES ('9e215a16-a03e-4157-a74a-b9fdca53985a', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-11-02 21:23:15.107563+00', 'package', NULL, NULL, '2026-11-03 21:23:22.113565+00');


--
-- Data for Name: brews; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.brews (id, user_id, device_id, recipe_id, name, recipe, status, started_at, ended_at, energy_wh, source, plan, reminded, equipment_id, snapshot, day_ended_at) VALUES ('491cb66c-d8a7-4199-8b77-2816fa3812ab', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', NULL, '26192309-2bcd-41fc-bca8-8e694052d1be', 'Чешский пилснер', '{}', 'finished', '2026-11-03 21:23:19.449149+00', '2026-11-03 21:22:15.107563+00', 0, 'manual', '{"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "volume": 20.0, "dryHops": [{"day": 5, "items": ["Saaz 20 г"], "gravity": null}], "efficiency": 72.0, "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days", "gravity": null}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days", "gravity": null}]}', '["dry-5", "measure-11"]', '7144c80f-aef7-4513-baca-fc30e6eab8a7', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 26.7, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 20.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 20.0, "efficiency": 72.0, "evaporation": 3.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 1.92, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 2.31, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2, "attenuation": 80.0}], "targets": {"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "ebc": 10.599781271220357, "ibu": 21.980601119837132}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 4.073}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.231}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', '2026-11-03 21:22:15.107563+00');
INSERT INTO public.brews (id, user_id, device_id, recipe_id, name, recipe, status, started_at, ended_at, energy_wh, source, plan, reminded, equipment_id, snapshot, day_ended_at) VALUES ('e6bc7dd2-743a-4105-91d8-6df1ca79af04', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', NULL, '26192309-2bcd-41fc-bca8-8e694052d1be', 'Чешский пилснер', '{}', 'finished', '2026-10-24 21:23:15.107563+00', NULL, 0, 'manual', '{"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "volume": 20.0, "dryHops": [{"day": 5, "items": ["Saaz 20 г"], "gravity": null}], "efficiency": 72.0, "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days", "gravity": null}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days", "gravity": null}]}', '["measure-13", "dry-5", "measure-20"]', '7144c80f-aef7-4513-baca-fc30e6eab8a7', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 26.7, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 20.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 20.0, "efficiency": 72.0, "evaporation": 3.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 1.92, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 2.31, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2, "attenuation": 80.0}], "targets": {"fg": 1.0095022803983802, "og": 1.0475114019919007, "abv": 5.053810435529233, "ebc": 10.599781271220357, "ibu": 21.980601119837132}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 4.073}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.231}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', '2026-10-24 21:23:15.107563+00');
INSERT INTO public.brews (id, user_id, device_id, recipe_id, name, recipe, status, started_at, ended_at, energy_wh, source, plan, reminded, equipment_id, snapshot, day_ended_at) VALUES ('bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '69b58f03-077f-424d-931d-9d1dfdb2d486', '88383611-9464-45ad-8c1b-ad28462bffa7', '26192309-2bcd-41fc-bca8-8e694052d1be', 'Чешский пилснер', '{"name": "Чешский пилснер", "slots": [{"items": [{"kind": "hop", "name": "Saaz", "unit": "g", "amount": 60.0, "minutes": 60, "whirlpool": null}], "label": "Saaz 60 г", "minutes": 60}, {"items": [{"kind": "hop", "name": "Saaz", "unit": "g", "amount": 40.0, "minutes": 15, "whirlpool": null}], "label": "Saaz 40 г", "minutes": 15}, {"items": [{"kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1.0, "minutes": 10, "whirlpool": null}], "label": "Ирландский мох 1 шт", "minutes": 10}], "steps": [{"boil": false, "name": "Белковая", "temp": 52.0, "watts": null, "minutes": 10}, {"boil": false, "name": "Осахаривание", "temp": 65.0, "watts": null, "minutes": 50}, {"boil": false, "name": "Мэш-аут", "temp": 78.0, "watts": null, "minutes": 10}, {"boil": true, "name": "Кипячение", "temp": 100.0, "watts": null, "minutes": 90}], "brewId": "bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e", "timers": [60, 15, 10], "recipeId": "26192309-2bcd-41fc-bca8-8e694052d1be"}', 'finished', '2026-10-25 21:23:15.107563+00', '2026-10-26 01:23:15.107563+00', 6543.2, 'device', '{"fg": 1.0095011785708896, "og": 1.0475058928544483, "abv": 5.053180643775918, "volume": 30.0, "dryHops": [{"day": 5, "items": ["Saaz 30 г"], "gravity": null}], "efficiency": 75.0, "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days", "gravity": null}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days", "gravity": null}]}', '[]', '5ac0e0a7-7caa-42c3-9594-f92480b477e5', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 60.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 30.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 30.0, "efficiency": 75.0, "evaporation": 3.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 2.77, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 3.32, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2, "attenuation": 80.0}], "targets": {"fg": 1.0095011785708896, "og": 1.0475058928544483, "abv": 5.053180643775918, "ebc": 10.30010471720341, "ibu": 21.974861487078655}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 5.865}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.332}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', '2026-10-25 21:23:15.107563+00');


--
-- Data for Name: comment_votes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.comment_votes (user_id, comment_id, value, created_at) VALUES ('bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'e63fe7e2-8555-46f8-b927-be9908b88751', 1, '2026-11-03 21:23:17.83014+00');
INSERT INTO public.comment_votes (user_id, comment_id, value, created_at) VALUES ('69b58f03-077f-424d-931d-9d1dfdb2d486', '1b4eac9b-562f-47ad-ba8c-df452fd17939', 1, '2026-11-03 21:23:17.921096+00');
INSERT INTO public.comment_votes (user_id, comment_id, value, created_at) VALUES ('69b58f03-077f-424d-931d-9d1dfdb2d486', 'a2c31e12-97a2-40a9-9f15-7e7610c72e9f', -1, '2026-11-03 21:23:18.006479+00');


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('e63fe7e2-8555-46f8-b927-be9908b88751', '26192309-2bcd-41fc-bca8-8e694052d1be', '69b58f03-077f-424d-931d-9d1dfdb2d486', '1b4eac9b-562f-47ad-ba8c-df452fd17939', 'Спасибо! Диацетиловую паузу не пропускай.', '2026-11-03 21:23:17.241836+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('8088b513-4e2f-44c4-8abe-2f75184aad12', '26192309-2bcd-41fc-bca8-8e694052d1be', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '1b4eac9b-562f-47ad-ba8c-df452fd17939', 'Не пропущу. А сухое охмеление — на 5-й день?', '2026-11-03 21:23:17.331362+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('1b4eac9b-562f-47ad-ba8c-df452fd17939', '26192309-2bcd-41fc-bca8-8e694052d1be', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', NULL, 'Отличный рецепт, сварил — вышло очень чисто.', '2026-11-03 21:23:17.08898+00', '2026-11-03 21:23:17.384135+00', NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('c7b6c47b-7db7-4f9c-9b39-19a12a42d706', '26192309-2bcd-41fc-bca8-8e694052d1be', '69b58f03-077f-424d-931d-9d1dfdb2d486', '241ef3ba-3f6c-441a-8a46-6d83aff39003', 'Ответ на тот, что удалят.', '2026-11-03 21:23:17.482826+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('241ef3ba-3f6c-441a-8a46-6d83aff39003', '26192309-2bcd-41fc-bca8-8e694052d1be', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', NULL, '', '2026-11-03 21:23:17.423503+00', NULL, '2026-11-03 21:23:17.564147+00');
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('83cc530f-d768-4786-ae59-8283b9a6f28f', 'ca9600d3-e09f-490c-be61-23578226e2b3', '69b58f03-077f-424d-931d-9d1dfdb2d486', NULL, 'Интересное пшеничное.', '2026-11-03 21:23:17.609925+00', NULL, NULL);
INSERT INTO public.comments (id, recipe_id, user_id, parent_id, text, created_at, edited_at, deleted_at) VALUES ('a2c31e12-97a2-40a9-9f15-7e7610c72e9f', 'ca9600d3-e09f-490c-be61-23578226e2b3', '13b02777-ec06-4c95-b9d8-2b141f41fae7', NULL, 'А дрожжи можно заменить?', '2026-11-03 21:23:17.707443+00', NULL, NULL);


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.devices (id, user_id, tuya_id, name, model, created_at, agent_id, limits) VALUES ('88383611-9464-45ad-8c1b-ad28462bffa7', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'fixture-easybrew-1', 'Easy Brew 40', 'easybrew40', '2026-11-03 21:23:18.271467+00', 'eb463948-0d61-4245-8a24-07e2f440ee5d', '{"maxTemp": 100.0, "minTemp": 20.0, "boilTemp": 100.1, "maxSteps": 9, "maxWatts": 3500, "minWatts": 500, "wattsStep": 100, "maxAdditions": 9}');


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('5ac0e0a7-7caa-42c3-9594-f92480b477e5', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'Easy Brew 40', 'easybrew', '88383611-9464-45ad-8c1b-ad28462bffa7', NULL, 75, 3, true, '2026-11-03 21:23:18.311754+00', NULL, '{}', NULL);
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('5c47cd24-103c-4a68-a031-f19a262a1326', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'Кастрюля 30 л', 'manual', NULL, 30, 70, 3.5, false, '2026-11-03 21:23:18.436157+00', 35, '{}', 'запасная');
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('8cd2cb8d-0547-4e71-a816-2cabab43b1f5', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'ЦКТ 32 л', 'fermenter', NULL, NULL, NULL, NULL, false, '2026-11-03 21:23:18.598361+00', NULL, '{"volume": 32.0}', NULL);
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('7144c80f-aef7-4513-baca-fc30e6eab8a7', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'Котёл читателя', 'manual', NULL, 20, 72, 3, true, '2026-11-03 21:23:18.739222+00', NULL, '{}', NULL);
INSERT INTO public.equipment (id, user_id, name, kind, device_id, volume, efficiency, evaporation, main, created_at, kettle, props, notes) VALUES ('75270efa-eb68-4e9b-9fe4-269eef641690', '7d8ecc90-e3f3-486f-a288-e4389a00edc0', 'Кастрюля до входа', 'manual', NULL, 25, NULL, NULL, true, '2026-11-03 21:23:22.185882+00', NULL, '{}', NULL);


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (1, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:23:15.107563+00', 'start', 'Программа запущена', '{"step": 0, "temp": 50.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (2, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:38:15.107563+00', 'step', 'Шаг 1: Белковая', '{"step": 1, "temp": 51.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (3, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:53:15.107563+00', 'alert', 'Засыпьте солод', '{"step": 2, "temp": 52.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (4, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:08:15.107563+00', 'addition', 'Хмель Saaz 60 г', '{"step": 3, "temp": 53.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (5, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:23:15.107563+00', 'end', 'Программа закончена', '{"step": 4, "temp": 54.5}');
INSERT INTO public.events (id, device_id, brew_id, at, kind, text, data) VALUES (6, '88383611-9464-45ad-8c1b-ad28462bffa7', NULL, '2026-11-01 21:23:15.107563+00', 'info', 'Агент подключился', 'null');


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.favorites (user_id, recipe_id, created_at) VALUES ('bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '26192309-2bcd-41fc-bca8-8e694052d1be', '2026-11-03 21:23:16.794167+00');
INSERT INTO public.favorites (user_id, recipe_id, created_at) VALUES ('69b58f03-077f-424d-931d-9d1dfdb2d486', '26192309-2bcd-41fc-bca8-8e694052d1be', '2026-11-03 21:23:16.831288+00');
INSERT INTO public.favorites (user_id, recipe_id, created_at) VALUES ('69b58f03-077f-424d-931d-9d1dfdb2d486', 'ca9600d3-e09f-490c-be61-23578226e2b3', '2026-11-03 21:23:16.865972+00');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('a52482bf-d480-444b-9da5-23bc9afc45c3', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'comment', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '26192309-2bcd-41fc-bca8-8e694052d1be', '1b4eac9b-562f-47ad-ba8c-df452fd17939', '2026-11-03 21:23:17.102496+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('cbf734fe-7ff1-442c-b9bf-80a50171b3c2', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'reply', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '26192309-2bcd-41fc-bca8-8e694052d1be', '8088b513-4e2f-44c4-8abe-2f75184aad12', '2026-11-03 21:23:17.337016+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('bc69c79d-e3d8-446f-82d6-f338d43d7197', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'reply', '69b58f03-077f-424d-931d-9d1dfdb2d486', '26192309-2bcd-41fc-bca8-8e694052d1be', 'c7b6c47b-7db7-4f9c-9b39-19a12a42d706', '2026-11-03 21:23:17.48801+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('947b53d7-c70b-471d-9c56-73689c554249', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'comment', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'ca9600d3-e09f-490c-be61-23578226e2b3', '83cc530f-d768-4786-ae59-8283b9a6f28f', '2026-11-03 21:23:17.612913+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('f85e3357-dc23-45ac-9f8e-ffc8ccf03afd', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'comment', '13b02777-ec06-4c95-b9d8-2b141f41fae7', 'ca9600d3-e09f-490c-be61-23578226e2b3', 'a2c31e12-97a2-40a9-9f15-7e7610c72e9f', '2026-11-03 21:23:17.711188+00', NULL, NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('ca91c91f-4d85-44b5-af7f-15fee70cab26', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'reply', '69b58f03-077f-424d-931d-9d1dfdb2d486', '26192309-2bcd-41fc-bca8-8e694052d1be', 'e63fe7e2-8555-46f8-b927-be9908b88751', '2026-11-03 21:23:17.24652+00', '2026-11-03 21:23:18.152418+00', NULL, 'null');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('fd859725-5ba2-46e3-a884-3a6003c49a2a', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'brew', NULL, NULL, NULL, '2026-11-03 21:23:19.561916+00', NULL, '491cb66c-d8a7-4199-8b77-2816fa3812ab', '{"text": "Saaz 20 г", "title": "Сухое охмеление"}');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('84f0ada8-2192-4f92-95d5-4a316ba85d0d', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'brew', NULL, NULL, NULL, '2026-11-03 21:23:19.586056+00', NULL, 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', '{"text": "«Основное» по прикидке подходит к концу — до 1,021 (5,2 °P)", "title": "Пора замерить плотность"}');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('dbbac53c-819f-4cfc-b0ee-1e50dc03840c', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'brew', NULL, NULL, NULL, '2026-11-03 21:23:19.58641+00', NULL, '491cb66c-d8a7-4199-8b77-2816fa3812ab', '{"text": "«Основное» по прикидке подходит к концу — до 1,020 (5,1 °P)", "title": "Пора замерить плотность"}');
INSERT INTO public.notifications (id, user_id, kind, actor_id, recipe_id, comment_id, created_at, read_at, brew_id, data) VALUES ('77405c30-bfe0-476f-97f4-8f55b7173373', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'brew', NULL, NULL, NULL, '2026-11-03 21:23:19.561702+00', NULL, 'e6bc7dd2-743a-4105-91d8-6df1ca79af04', NULL);


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at) VALUES ('51dcf38e-3f44-4039-bba3-258d58210f7d', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'https://fcm.googleapis.com/fcm/send/fixture-admin', 'p256dh-admin-test', 'auth-admin-test', 'Fixture Chrome', '2026-11-03 21:23:22.143899+00', '2026-11-03 21:23:22.144098+00');
INSERT INTO public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at) VALUES ('b9665d2b-af31-474b-92d2-38c7c050897f', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'https://fcm.googleapis.com/fcm/send/fixture-reader', 'p256dh-reader-test', 'auth-reader-test', NULL, '2026-11-03 21:23:22.169232+00', '2026-11-03 21:23:22.169352+00');


--
-- Data for Name: readings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (1, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:23:15.107563+00', 20, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (2, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:24:15.107563+00', 21.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (3, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:25:15.107563+00', 22.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (4, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:26:15.107563+00', 24.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (5, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:27:15.107563+00', 25.6, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (6, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:28:15.107563+00', 27, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (7, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:29:15.107563+00', 28.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (8, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:30:15.107563+00', 29.799999999999997, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (9, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:31:15.107563+00', 31.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (10, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:32:15.107563+00', 32.6, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (11, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:33:15.107563+00', 34, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (12, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:34:15.107563+00', 35.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (13, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:35:15.107563+00', 36.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (14, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:36:15.107563+00', 38.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (15, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:37:15.107563+00', 39.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (16, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:38:15.107563+00', 41, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (17, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:39:15.107563+00', 42.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (18, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:40:15.107563+00', 43.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (19, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:41:15.107563+00', 45.2, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (20, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:42:15.107563+00', 46.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (21, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:43:15.107563+00', 48, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (22, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:44:15.107563+00', 49.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (23, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:45:15.107563+00', 50.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (24, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:46:15.107563+00', 52.199999999999996, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (25, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:47:15.107563+00', 53.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (26, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:48:15.107563+00', 55, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (27, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:49:15.107563+00', 56.4, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (28, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:50:15.107563+00', 57.8, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (29, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:51:15.107563+00', 59.199999999999996, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (30, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:52:15.107563+00', 60.599999999999994, NULL, 0, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (31, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:53:15.107563+00', 62, NULL, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (32, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:54:15.107563+00', 63.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (33, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:55:15.107563+00', 64.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (34, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:56:15.107563+00', 66.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (35, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:57:15.107563+00', 67.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (36, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:58:15.107563+00', 69, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (37, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 21:59:15.107563+00', 70.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (38, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:00:15.107563+00', 71.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (39, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:01:15.107563+00', 73.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (40, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:02:15.107563+00', 74.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (41, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:03:15.107563+00', 76, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (42, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:04:15.107563+00', 77.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (43, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:05:15.107563+00', 78.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (44, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:06:15.107563+00', 80.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (45, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:07:15.107563+00', 81.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (46, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:08:15.107563+00', 83, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (47, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:09:15.107563+00', 84.39999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (48, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:10:15.107563+00', 85.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (49, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:11:15.107563+00', 87.19999999999999, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (50, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:12:15.107563+00', 88.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (51, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:13:15.107563+00', 20, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (52, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:14:15.107563+00', 21.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (53, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:15:15.107563+00', 22.8, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (54, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:16:15.107563+00', 24.2, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (55, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:17:15.107563+00', 25.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (56, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:18:15.107563+00', 27, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (57, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:19:15.107563+00', 28.4, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (58, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:20:15.107563+00', 29.799999999999997, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (59, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:21:15.107563+00', 31.2, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (60, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:22:15.107563+00', 32.6, 65, 1, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (61, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:23:15.107563+00', 34, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (62, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:24:15.107563+00', 35.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (63, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:25:15.107563+00', 36.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (64, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:26:15.107563+00', 38.2, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (65, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:27:15.107563+00', 39.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (66, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:28:15.107563+00', 41, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (67, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:29:15.107563+00', 42.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (68, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:30:15.107563+00', 43.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (69, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:31:15.107563+00', 45.2, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (70, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:32:15.107563+00', 46.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (71, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:33:15.107563+00', 48, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (72, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:34:15.107563+00', 49.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (73, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:35:15.107563+00', 50.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (74, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:36:15.107563+00', 52.199999999999996, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (75, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:37:15.107563+00', 53.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (76, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:38:15.107563+00', 55, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (77, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:39:15.107563+00', 56.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (78, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:40:15.107563+00', 57.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (79, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:41:15.107563+00', 59.199999999999996, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (80, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:42:15.107563+00', 60.599999999999994, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (81, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:43:15.107563+00', 62, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (82, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:44:15.107563+00', 63.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (83, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:45:15.107563+00', 64.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (84, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:46:15.107563+00', 66.19999999999999, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (85, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:47:15.107563+00', 67.6, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (86, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:48:15.107563+00', 69, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (87, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:49:15.107563+00', 70.4, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (88, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:50:15.107563+00', 71.8, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (89, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:51:15.107563+00', 73.19999999999999, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (90, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:52:15.107563+00', 74.6, 65, 2, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (91, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:53:15.107563+00', 76, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (92, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:54:15.107563+00', 77.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (93, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:55:15.107563+00', 78.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (94, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:56:15.107563+00', 80.19999999999999, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (95, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:57:15.107563+00', 81.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (96, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:58:15.107563+00', 83, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (97, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 22:59:15.107563+00', 84.39999999999999, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (98, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:00:15.107563+00', 85.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (99, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:01:15.107563+00', 87.19999999999999, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (100, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:02:15.107563+00', 88.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (101, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:03:15.107563+00', 20, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (102, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:04:15.107563+00', 21.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (103, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:05:15.107563+00', 22.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (104, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:06:15.107563+00', 24.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (105, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:07:15.107563+00', 25.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (106, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:08:15.107563+00', 27, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (107, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:09:15.107563+00', 28.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (108, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:10:15.107563+00', 29.799999999999997, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (109, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:11:15.107563+00', 31.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (110, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:12:15.107563+00', 32.6, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (111, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:13:15.107563+00', 34, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (112, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:14:15.107563+00', 35.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (113, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:15:15.107563+00', 36.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (114, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:16:15.107563+00', 38.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (115, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:17:15.107563+00', 39.599999999999994, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (116, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:18:15.107563+00', 41, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (117, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:19:15.107563+00', 42.4, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (118, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:20:15.107563+00', 43.8, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (119, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:21:15.107563+00', 45.2, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (120, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:22:15.107563+00', 46.599999999999994, 65, 3, 'mash');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (121, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:23:15.107563+00', 48, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (122, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:24:15.107563+00', 49.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (123, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:25:15.107563+00', 50.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (124, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:26:15.107563+00', 52.199999999999996, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (125, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:27:15.107563+00', 53.599999999999994, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (126, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:28:15.107563+00', 55, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (127, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:29:15.107563+00', 56.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (128, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:30:15.107563+00', 57.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (129, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:31:15.107563+00', 59.199999999999996, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (130, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:32:15.107563+00', 60.599999999999994, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (131, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:33:15.107563+00', 62, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (132, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:34:15.107563+00', 63.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (133, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:35:15.107563+00', 64.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (134, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:36:15.107563+00', 66.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (135, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:37:15.107563+00', 67.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (136, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:38:15.107563+00', 69, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (137, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:39:15.107563+00', 70.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (138, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:40:15.107563+00', 71.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (139, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:41:15.107563+00', 73.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (140, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:42:15.107563+00', 74.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (141, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:43:15.107563+00', 76, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (142, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:44:15.107563+00', 77.4, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (143, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:45:15.107563+00', 78.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (144, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:46:15.107563+00', 80.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (145, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:47:15.107563+00', 81.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (146, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:48:15.107563+00', 83, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (147, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:49:15.107563+00', 84.39999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (148, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:50:15.107563+00', 85.8, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (149, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:51:15.107563+00', 87.19999999999999, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (150, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:52:15.107563+00', 88.6, 65, 4, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (151, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:53:15.107563+00', 20, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (152, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:54:15.107563+00', 21.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (153, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:55:15.107563+00', 22.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (154, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:56:15.107563+00', 24.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (155, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:57:15.107563+00', 25.6, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (156, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:58:15.107563+00', 27, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (157, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-25 23:59:15.107563+00', 28.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (158, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:00:15.107563+00', 29.799999999999997, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (159, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:01:15.107563+00', 31.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (160, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:02:15.107563+00', 32.6, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (161, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:03:15.107563+00', 34, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (162, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:04:15.107563+00', 35.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (163, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:05:15.107563+00', 36.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (164, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:06:15.107563+00', 38.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (165, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:07:15.107563+00', 39.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (166, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:08:15.107563+00', 41, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (167, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:09:15.107563+00', 42.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (168, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:10:15.107563+00', 43.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (169, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:11:15.107563+00', 45.2, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (170, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:12:15.107563+00', 46.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (171, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:13:15.107563+00', 48, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (172, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:14:15.107563+00', 49.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (173, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:15:15.107563+00', 50.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (174, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:16:15.107563+00', 52.199999999999996, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (175, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:17:15.107563+00', 53.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (176, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:18:15.107563+00', 55, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (177, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:19:15.107563+00', 56.4, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (178, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:20:15.107563+00', 57.8, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (179, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:21:15.107563+00', 59.199999999999996, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (180, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:22:15.107563+00', 60.599999999999994, 65, 5, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (181, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:23:15.107563+00', 62, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (182, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:24:15.107563+00', 63.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (183, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:25:15.107563+00', 64.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (184, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:26:15.107563+00', 66.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (185, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:27:15.107563+00', 67.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (186, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:28:15.107563+00', 69, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (187, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:29:15.107563+00', 70.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (188, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:30:15.107563+00', 71.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (189, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:31:15.107563+00', 73.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (190, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:32:15.107563+00', 74.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (191, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:33:15.107563+00', 76, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (192, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:34:15.107563+00', 77.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (193, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:35:15.107563+00', 78.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (194, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:36:15.107563+00', 80.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (195, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:37:15.107563+00', 81.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (196, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:38:15.107563+00', 83, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (197, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:39:15.107563+00', 84.39999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (198, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:40:15.107563+00', 85.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (199, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:41:15.107563+00', 87.19999999999999, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (200, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:42:15.107563+00', 88.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (201, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:43:15.107563+00', 20, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (202, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:44:15.107563+00', 21.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (203, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:45:15.107563+00', 22.8, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (204, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:46:15.107563+00', 24.2, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (205, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:47:15.107563+00', 25.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (206, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:48:15.107563+00', 27, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (207, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:49:15.107563+00', 28.4, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (208, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:50:15.107563+00', 29.799999999999997, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (209, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:51:15.107563+00', 31.2, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (210, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:52:15.107563+00', 32.6, 65, 6, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (211, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:53:15.107563+00', 34, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (212, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:54:15.107563+00', 35.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (213, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:55:15.107563+00', 36.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (214, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:56:15.107563+00', 38.2, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (215, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:57:15.107563+00', 39.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (216, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:58:15.107563+00', 41, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (217, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 00:59:15.107563+00', 42.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (218, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:00:15.107563+00', 43.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (219, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:01:15.107563+00', 45.2, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (220, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:02:15.107563+00', 46.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (221, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:03:15.107563+00', 48, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (222, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:04:15.107563+00', 49.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (223, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:05:15.107563+00', 50.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (224, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:06:15.107563+00', 52.199999999999996, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (225, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:07:15.107563+00', 53.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (226, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:08:15.107563+00', 55, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (227, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:09:15.107563+00', 56.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (228, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:10:15.107563+00', 57.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (229, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:11:15.107563+00', 59.199999999999996, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (230, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:12:15.107563+00', 60.599999999999994, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (231, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:13:15.107563+00', 62, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (232, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:14:15.107563+00', 63.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (233, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:15:15.107563+00', 64.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (234, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:16:15.107563+00', 66.19999999999999, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (235, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:17:15.107563+00', 67.6, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (236, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:18:15.107563+00', 69, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (237, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:19:15.107563+00', 70.4, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (238, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:20:15.107563+00', 71.8, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (239, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:21:15.107563+00', 73.19999999999999, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (240, '88383611-9464-45ad-8c1b-ad28462bffa7', 'bf49e03f-2c0d-4397-b3fc-300e9c9d8e8e', '2026-10-26 01:22:15.107563+00', 74.6, 65, 7, 'boil');
INSERT INTO public.readings (id, device_id, brew_id, at, temp, target, step, status) VALUES (241, '88383611-9464-45ad-8c1b-ad28462bffa7', NULL, '2026-11-01 21:23:15.107563+00', 18.75, NULL, NULL, NULL);


--
-- Data for Name: recipe_photos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('3e114383-ff67-4007-a0a7-f53e5c85f2f6', '26192309-2bcd-41fc-bca8-8e694052d1be', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'image/png', '\x89504e470d0a1a0a0000000d4948445200000280000001e00802000000bab34bb30000076749444154789cedd73111c03010c4403bb8823d708c232c5e8577095ca9b97dbe770100b39ee13d00408001a0e10103404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c00020c0077f080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003800003c01d3c6000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c0001010680800003404080012020c00010106000080830000404180002020c006bde0f2f3605a032f90e4d0000000049454e44ae426082', NULL, '2026-11-03 21:23:16.578938+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc0001108016801e003012200021101031101ffc4001500010100000000000000000000000000000007ffc40014100100000000000000000000000000000000ffc400160101010100000000000000000000000000000607ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00a780cb546000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffd9');
INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('389c8ff3-f6b1-42ee-84ba-8666857756e2', '26192309-2bcd-41fc-bca8-8e694052d1be', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'image/png', '\x89504e470d0a1a0a0000000d49484452000003200000025808020000001514152700000aad49444154789cedd831110021100441783548441802dfc40417740bd8786af7bb670100d0f9c22d000004160040cf8305001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000020b0060360f1600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100082c0080d93c580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000318105001013580000020b0060360f1600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600404c600100c4041600c06afd9c9b06042df50dfa0000000049454e44ae426082', 'Фото автора, CC-BY', '2026-11-03 21:23:16.641479+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc0001108016801e003012200021101031101ffc4001500010100000000000000000000000000000001ffc40014100100000000000000000000000000000000ffc4001501010100000000000000000000000000000006ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00a021954000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffd9');
INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('bde38248-a805-4b3b-b7cd-ba29f13b09f9', 'ca9600d3-e09f-490c-be61-23578226e2b3', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'image/png', '\x89504e470d0a1a0a0000000d49484452000001e0000001e00802000000f2b629c2000006b249444154789cedd43101c02000c030986ac422020933c04f8f4441afceb3d700a0e77b1d00c09d410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934409441034419344094410344193440944103441934c068fa018d900604a5eb4fa80000000049454e44ae426082', NULL, '2026-11-03 21:23:16.745688+00', '\xffd8ffe000104a46494600010100000100010000ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc000110801e001e003012200021101031101ffc4001500010100000000000000000000000000000007ffc40014100100000000000000000000000000000000ffc400160101010100000000000000000000000000000506ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00ba00c12a8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003ffd9');
INSERT INTO public.recipe_photos (id, recipe_id, user_id, content_type, data, credit, created_at, thumb) VALUES ('5d7ff0c8-1551-4e50-bfb7-74ed4c6ccafd', '7a79f5b9-c8cb-40dd-bda0-3a24a0d8bf94', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'image/png', '\x89504e470d0a1a0a0000000d4948445200000140000000f00802000000fe4f2a3c000002d649444154789cedd3410dc02000c040981094a004ff42e6810f6972a7a09fceb3d7009abed701c03d0343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc0106660083330841918c20c0c610686300343988121ccc010666008333084191846d70ff44b029450487d700000000049454e44ae426082', NULL, '2026-11-03 21:23:16.690382+00', NULL);


--
-- Data for Name: recipe_votes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipe_votes (user_id, recipe_id, value, created_at) VALUES ('bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '26192309-2bcd-41fc-bca8-8e694052d1be', 1, '2026-11-03 21:23:16.897707+00');
INSERT INTO public.recipe_votes (user_id, recipe_id, value, created_at) VALUES ('13b02777-ec06-4c95-b9d8-2b141f41fae7', '26192309-2bcd-41fc-bca8-8e694052d1be', -1, '2026-11-03 21:23:16.956123+00');
INSERT INTO public.recipe_votes (user_id, recipe_id, value, created_at) VALUES ('69b58f03-077f-424d-931d-9d1dfdb2d486', 'ca9600d3-e09f-490c-be61-23578226e2b3', 1, '2026-11-03 21:23:16.993355+00');


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('26192309-2bcd-41fc-bca8-8e694052d1be', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'Чешский пилснер', '2026-11-03 21:23:16.205413+00', '2026-11-03 21:23:16.20565+00', '{"boil": {"minutes": 90}, "hops": [{"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 60.0, "minutes": 60}, {"use": "boil", "name": "Saaz", "alpha": 3.5, "amount": 40.0, "minutes": 15}, {"day": 5, "use": "dry_hop", "name": "Saaz", "alpha": 3.5, "amount": 30.0}], "mash": [{"name": "Белковая", "temp": 52.0, "minutes": 10}, {"name": "Осахаривание", "temp": 65.0, "minutes": 50}, {"name": "Мэш-аут", "temp": 78.0, "minutes": 10}], "name": "Чешский пилснер", "batch": {"volume": 30.0, "efficiency": 83.0}, "miscs": [{"use": "boil", "kind": "fining", "name": "Ирландский мох", "unit": "pcs", "amount": 1.0, "minutes": 10}], "notes": "Тестовый рецепт для проверки переноса.", "style": {"code": "3B", "name": "Czech Premium Pale Lager"}, "water": {"ph": 5.3, "ratio": 3.0, "source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": [{"name": "", "agent": "cacl2", "amount": 2.5, "target": "mash"}, {"name": "", "agent": "lactic80", "amount": 3.0, "target": "mash"}]}, "yeasts": [{"form": "dry", "name": "W-34/70", "unit": "pkg", "amount": 2.0, "attenuation": 80.0}], "targets": {"fg": 1.0095016886763684, "og": 1.047508443381842, "abv": 5.053472212778213, "ebc": 9.60857114958257, "ibu": 21.974357783061897}, "fermentables": [{"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 5.3}, {"ebc": 90.0, "use": "mash", "kind": "grain", "name": "Caramunich I", "amount": 0.3}], "fermentation": [{"days": 10.0, "name": "Основное", "temp": 10.0, "until": "gravity", "gravity": 1.02}, {"days": 3.0, "name": "Диацетиловая пауза", "temp": 16.0, "until": "days"}, {"days": 21.0, "name": "Лагеризация", "temp": 3.0, "until": "days"}]}', 'public', '2026-11-03 21:23:16.298851+00');
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('7a79f5b9-c8cb-40dd-bda0-3a24a0d8bf94', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'Личный: короткая программа', '2026-11-03 21:23:16.408098+00', '2026-11-03 21:23:16.408176+00', '{"boil": {"minutes": 30}, "hops": [{"use": "boil", "name": "Test", "amount": 10.0, "minutes": 5}], "mash": [{"name": "Пауза", "temp": 65.0, "minutes": 30}], "name": "Личный: короткая программа", "batch": {}, "miscs": [], "notes": "", "water": {"source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": []}, "yeasts": [], "targets": {}, "fermentables": [], "fermentation": []}', 'private', NULL);
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('ca9600d3-e09f-490c-be61-23578226e2b3', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'Светлое пшеничное', '2026-11-03 21:23:16.448013+00', '2026-11-03 21:23:16.448085+00', '{"boil": {"minutes": 60}, "hops": [{"use": "boil", "name": "Hallertau", "alpha": 4.0, "amount": 25.0, "minutes": 60}], "mash": [{"name": "Осахаривание", "temp": 66.0, "minutes": 60}], "name": "Светлое пшеничное", "batch": {"volume": 25.0, "efficiency": 75.0}, "miscs": [], "notes": "", "water": {"source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": []}, "yeasts": [{"form": "dry", "name": "WB-06", "unit": "pkg", "attenuation": 78.0}], "targets": {"fg": 1.0101545640189333, "og": 1.04615710917697, "abv": 4.781202233110925, "ebc": 6.6420900653978086, "ibu": 9.550785786486495}, "fermentables": [{"ebc": 4.0, "use": "mash", "kind": "grain", "name": "Wheat Blanc", "amount": 2.5}, {"ebc": 3.5, "use": "mash", "kind": "grain", "name": "Pilsner", "amount": 2.5}], "fermentation": [{"days": 0, "name": "Брожение", "temp": 20.0, "until": "fg"}]}', 'public', '2026-11-03 21:23:16.493918+00');
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('04454f82-2f66-4055-acc3-34e34a2a1bcc', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'Черновик читателя', '2026-11-03 21:23:16.537423+00', '2026-11-03 21:23:16.537548+00', '{"hops": [], "mash": [], "name": "Черновик читателя", "batch": {}, "miscs": [], "notes": "", "water": {"source": {"ca": 0, "cl": 0, "mg": 0, "na": 0, "so4": 0, "hco3": 0}, "additions": []}, "yeasts": [], "targets": {}, "fermentables": [], "fermentation": []}', 'private', NULL);
INSERT INTO public.recipes (id, user_id, name, created_at, updated_at, data, visibility, published_at) VALUES ('a1d466ba-7efa-4d70-af27-c4889c8df411', '7d8ecc90-e3f3-486f-a288-e4389a00edc0', 'Рецепт до входа', '2026-11-03 21:23:22.18551+00', '2026-11-03 21:23:22.185533+00', '{"name": "Рецепт до входа", "notes": "заведён без входа"}', 'private', NULL);


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('bcbf7849-6bc7-4adb-9dfa-78c710d9f005', '69b58f03-077f-424d-931d-9d1dfdb2d486', 'e5b9ac493174d5096a30531d4d879f64c4fb7b48891c20b607de47df636fb6eb', 'Python-urllib/3.13', '2026-11-03 21:23:15.292674+00', '2026-11-03 21:23:15.292683+00', '2026-12-03 21:23:15.292539+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('02bc3f3b-6153-40f4-bfb7-9cc82ab9aafd', '13b02777-ec06-4c95-b9d8-2b141f41fae7', '31e39979cbb721c0470f636fcca035b51ecb6ea9ca04381b4ed3b7c2c3fc5c7e', 'Python-urllib/3.13', '2026-11-03 21:23:15.622337+00', '2026-11-03 21:23:15.622346+00', '2026-12-03 21:23:15.622226+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('856e1717-38e3-4768-9f33-f5fbf7f77a42', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '12536922dcf063d2f2ec9cfb083d63df7f952dfcda9b7a50d826b1b989b67ca2', 'Python-urllib/3.13', '2026-11-03 21:23:15.785711+00', '2026-11-03 21:23:15.78572+00', '2026-12-03 21:23:15.785577+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('9782f396-0b6b-46bc-af76-cee4f5e188d3', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '045994f9ef80926e09e7cddf33e71ddf0670674f7755139e7f4081a770c300bc', 'Python-urllib/3.13', '2026-11-03 21:23:16.038861+00', '2026-11-03 21:23:16.038868+00', '2026-12-03 21:23:16.038722+00');
INSERT INTO public.sessions (id, user_id, token_hash, user_agent, created_at, last_seen_at, expires_at) VALUES ('67d94f7c-772c-4950-ba35-60fb55079d41', 'bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', '0000000000000000000000000000000000000000000000000000000000000001', 'Старый браузер', '2026-09-04 21:23:15.107563+00', '2026-09-19 21:23:15.107563+00', '2026-10-19 21:23:15.107563+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('13b02777-ec06-4c95-b9d8-2b141f41fae7', 'Новичок', 'unverified@fixture.test', '2026-11-03 21:23:15.560755+00', 'scrypt$16384$8$1$I4aStq6B8TwqgrcG171uAw$rWWgvlTlbWhhsVYjfh03PHFbN1Dcdug03iJqppqueZo', NULL, 'user', 'новичок', NULL, 0, true, true);
INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('69b58f03-077f-424d-931d-9d1dfdb2d486', 'Хмелевар', 'admin@fixture.test', '2026-11-03 21:23:15.228018+00', 'scrypt$16384$8$1$mVLjgxdC6QcUVNquHBi2ug$ICW7v9oChWXbOhKx0zr-tjy54iVDRNibo06myyte1_Y', '2026-11-03 21:23:15.320898+00', 'admin', 'хмелевар', '\xffd8ffe000104a46494600010100000100010000ffdb0043000503040404030504040405050506070c08070707070f0b0b090c110f1212110f111113161c1713141a1511111821181a1d1d1f1f1f13172224221e241c1e1f1effdb0043010505050706070e08080e1e1411141e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1effc00011080100010003012200021101031101ffc4001500010100000000000000000000000000000005ffc40014100100000000000000000000000000000000ffc400160101010100000000000000000000000000000607ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00b603175f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003ffd9', 1, true, true);
INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('bb0e6654-4e93-40e5-a6ff-85bb2ea238d5', 'Читатель', 'reader@fixture.test', '2026-11-03 21:23:15.40923+00', 'scrypt$16384$8$1$4sbBOGtZV3YlYs3pBh4cUw$sn0vGmfd6Jo9zo2gyD5MLk-qpssaPiwIxL9dAiuawR4', '2026-11-03 21:23:15.503806+00', 'user', 'читатель', NULL, 0, true, false);
INSERT INTO public.users (id, name, email, created_at, password_hash, email_verified_at, role, name_key, avatar, avatar_version, push_comments, push_brews) VALUES ('7d8ecc90-e3f3-486f-a288-e4389a00edc0', NULL, NULL, '2026-11-03 21:23:22.177148+00', NULL, NULL, 'user', NULL, NULL, 0, true, true);


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


