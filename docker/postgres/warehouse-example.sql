-- Example warehouse for quarry: the jaffle_shop sample dataset (a fictional shop, synthetic data;
-- dbt Labs, Apache-2.0, via nao's example), as `npm run warehouse:load` leaves it.
-- CI loads it into the `warehouse` database; locally, without the DuckDB CLI:
--   docker exec -i quarry_postgres psql -U quarry -d warehouse < docker/postgres/warehouse-example.sql

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

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

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customer_id integer,
    first_name character varying,
    last_name character varying,
    first_order date,
    most_recent_order date,
    number_of_orders bigint,
    customer_lifetime_value double precision
);


--
-- Name: metricflow_time_spine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metricflow_time_spine (
    date_day date
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    order_id integer,
    customer_id integer,
    order_date date,
    status character varying,
    credit_card_amount double precision,
    coupon_amount double precision,
    bank_transfer_amount double precision,
    gift_card_amount double precision,
    amount double precision
);


--
-- Name: raw_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_customers (
    id integer,
    first_name character varying,
    last_name character varying
);


--
-- Name: raw_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_orders (
    id integer,
    user_id integer,
    order_date date,
    status character varying
);


--
-- Name: raw_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_payments (
    id integer,
    order_id integer,
    payment_method character varying,
    amount integer
);


--
-- Name: stg_customers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stg_customers AS
 SELECT id AS customer_id,
    first_name,
    last_name
   FROM public.raw_customers;


--
-- Name: stg_orders; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stg_orders AS
 SELECT id AS order_id,
    user_id AS customer_id,
    order_date,
    status
   FROM public.raw_orders;


--
-- Name: stg_payments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stg_payments AS
 SELECT id AS payment_id,
    order_id,
    payment_method,
    ((amount)::numeric / 100.0) AS amount
   FROM public.raw_payments;


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (customer_id, first_name, last_name, first_order, most_recent_order, number_of_orders, customer_lifetime_value) FROM stdin;
1	Michael	P.	2018-01-01	2018-02-10	2	33
2	Shawn	M.	2018-01-11	2018-01-11	1	23
3	Kathleen	P.	2018-01-02	2018-03-11	3	65
6	Sarah	R.	2018-02-19	2018-02-19	1	8
7	Martin	M.	2018-01-14	2018-01-14	1	26
8	Frank	R.	2018-01-29	2018-03-12	2	45
9	Jennifer	F.	2018-03-17	2018-03-17	1	30
11	Fred	S.	2018-03-23	2018-03-23	1	3
12	Amy	D.	2018-03-03	2018-03-03	1	4
13	Kathleen	M.	2018-03-07	2018-03-07	1	26
16	Amanda	H.	2018-02-02	2018-02-02	1	12
18	Johnny	K.	2018-02-27	2018-02-27	1	29
19	Virginia	F.	2018-03-16	2018-03-16	1	3
20	Anna	A.	2018-01-23	2018-01-23	1	15
21	Willie	H.	2018-03-28	2018-03-28	1	22
22	Sean	H.	2018-01-26	2018-03-01	3	52
25	Victor	H.	2018-01-17	2018-03-20	2	24
26	Aaron	R.	2018-02-11	2018-03-08	2	8
27	Benjamin	B.	2018-02-21	2018-04-04	2	27
28	Lisa	W.	2018-02-04	2018-02-04	1	3
30	Christina	W.	2018-03-02	2018-03-14	2	57
31	Jane	G.	2018-02-17	2018-02-17	1	18
32	Thomas	O.	2018-01-28	2018-01-28	1	30
33	Katherine	M.	2018-02-13	2018-02-13	1	14
34	Jennifer	S.	2018-02-26	2018-02-26	1	3
35	Sara	T.	2018-02-21	2018-03-21	2	34
36	Harold	O.	2018-03-10	2018-03-10	1	28
38	Dennis	J.	2018-02-06	2018-02-06	1	15
39	Louise	W.	2018-01-18	2018-01-18	1	10
40	Maria	A.	2018-01-17	2018-01-17	1	3
41	Gloria	C.	2018-04-07	2018-04-07	1	10
42	Diana	S.	2018-02-04	2018-03-12	2	27
46	Norma	C.	2018-03-24	2018-03-27	2	64
47	Marie	P.	2018-03-26	2018-03-31	2	36
50	Billy	L.	2018-01-05	2018-02-20	2	47
51	Howard	R.	2018-01-28	2018-02-23	3	99
52	Laura	F.	2018-03-23	2018-03-23	1	27
53	Anne	B.	2018-01-12	2018-03-11	2	39
54	Rose	M.	2018-01-07	2018-03-24	5	57
57	Paul	W.	2018-01-31	2018-03-05	2	26
59	Adam	A.	2018-01-15	2018-01-15	1	1
63	Edward	G.	2018-03-03	2018-04-03	2	23
64	David	C.	2018-01-05	2018-01-20	2	30
66	Adam	W.	2018-02-17	2018-04-03	3	39
68	Jesse	E.	2018-03-26	2018-03-26	1	23
69	Janet	P.	2018-02-02	2018-03-18	2	32
70	Helen	F.	2018-03-06	2018-03-26	2	54
71	Gerald	C.	2018-01-18	2018-02-24	3	44
76	Barbara	W.	2018-03-23	2018-03-23	1	2
79	Jack	R.	2018-02-28	2018-03-11	2	27
80	Phillip	H.	2018-02-08	2018-02-08	1	29
84	Christina	R.	2018-01-17	2018-04-02	2	36
85	Theresa	M.	2018-02-10	2018-04-09	2	33
86	Jason	C.	2018-01-24	2018-01-24	1	8
88	Adam	T.	2018-01-09	2018-01-09	1	16
89	Margaret	J.	2018-04-07	2018-04-07	1	14
90	Paul	P.	2018-03-23	2018-04-06	2	43
91	Todd	W.	2018-03-27	2018-03-27	1	29
92	Willie	O.	2018-02-16	2018-02-16	1	17
93	Frances	R.	2018-03-01	2018-03-01	1	2
94	Gregory	H.	2018-01-04	2018-01-29	2	24
99	Mary	G.	2018-01-14	2018-02-14	2	44
4	Jimmy	C.	\N	\N	\N	\N
5	Katherine	R.	\N	\N	\N	\N
10	Henry	W.	\N	\N	\N	\N
14	Steve	F.	\N	\N	\N	\N
15	Teresa	H.	\N	\N	\N	\N
17	Kimberly	R.	\N	\N	\N	\N
23	Mildred	A.	\N	\N	\N	\N
24	David	G.	\N	\N	\N	\N
29	Benjamin	K.	\N	\N	\N	\N
37	Shirley	J.	\N	\N	\N	\N
43	Kelly	N.	\N	\N	\N	\N
44	Jane	R.	\N	\N	\N	\N
45	Scott	B.	\N	\N	\N	\N
48	Lillian	C.	\N	\N	\N	\N
49	Judy	N.	\N	\N	\N	\N
55	Nicholas	R.	\N	\N	\N	\N
56	Joshua	K.	\N	\N	\N	\N
58	Kathryn	K.	\N	\N	\N	\N
60	Norma	W.	\N	\N	\N	\N
61	Timothy	R.	\N	\N	\N	\N
62	Elizabeth	P.	\N	\N	\N	\N
65	Brenda	W.	\N	\N	\N	\N
67	Michael	H.	\N	\N	\N	\N
72	Kathryn	O.	\N	\N	\N	\N
73	Alan	B.	\N	\N	\N	\N
74	Harry	A.	\N	\N	\N	\N
75	Andrea	H.	\N	\N	\N	\N
77	Anne	W.	\N	\N	\N	\N
78	Harry	H.	\N	\N	\N	\N
81	Shirley	H.	\N	\N	\N	\N
82	Arthur	D.	\N	\N	\N	\N
83	Virginia	R.	\N	\N	\N	\N
87	Phillip	B.	\N	\N	\N	\N
95	Lisa	P.	\N	\N	\N	\N
96	Jacqueline	A.	\N	\N	\N	\N
97	Shirley	D.	\N	\N	\N	\N
98	Nicole	M.	\N	\N	\N	\N
100	Jean	M.	\N	\N	\N	\N
\.


--
-- Data for Name: metricflow_time_spine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.metricflow_time_spine (date_day) FROM stdin;
2018-01-01
2018-01-02
2018-01-03
2018-01-04
2018-01-05
2018-01-06
2018-01-07
2018-01-08
2018-01-09
2018-01-10
2018-01-11
2018-01-12
2018-01-13
2018-01-14
2018-01-15
2018-01-16
2018-01-17
2018-01-18
2018-01-19
2018-01-20
2018-01-21
2018-01-22
2018-01-23
2018-01-24
2018-01-25
2018-01-26
2018-01-27
2018-01-28
2018-01-29
2018-01-30
2018-01-31
2018-02-01
2018-02-02
2018-02-03
2018-02-04
2018-02-05
2018-02-06
2018-02-07
2018-02-08
2018-02-09
2018-02-10
2018-02-11
2018-02-12
2018-02-13
2018-02-14
2018-02-15
2018-02-16
2018-02-17
2018-02-18
2018-02-19
2018-02-20
2018-02-21
2018-02-22
2018-02-23
2018-02-24
2018-02-25
2018-02-26
2018-02-27
2018-02-28
2018-03-01
2018-03-02
2018-03-03
2018-03-04
2018-03-05
2018-03-06
2018-03-07
2018-03-08
2018-03-09
2018-03-10
2018-03-11
2018-03-12
2018-03-13
2018-03-14
2018-03-15
2018-03-16
2018-03-17
2018-03-18
2018-03-19
2018-03-20
2018-03-21
2018-03-22
2018-03-23
2018-03-24
2018-03-25
2018-03-26
2018-03-27
2018-03-28
2018-03-29
2018-03-30
2018-03-31
2018-04-01
2018-04-02
2018-04-03
2018-04-04
2018-04-05
2018-04-06
2018-04-07
2018-04-08
2018-04-09
2018-04-10
2018-04-11
2018-04-12
2018-04-13
2018-04-14
2018-04-15
2018-04-16
2018-04-17
2018-04-18
2018-04-19
2018-04-20
2018-04-21
2018-04-22
2018-04-23
2018-04-24
2018-04-25
2018-04-26
2018-04-27
2018-04-28
2018-04-29
2018-04-30
2018-05-01
2018-05-02
2018-05-03
2018-05-04
2018-05-05
2018-05-06
2018-05-07
2018-05-08
2018-05-09
2018-05-10
2018-05-11
2018-05-12
2018-05-13
2018-05-14
2018-05-15
2018-05-16
2018-05-17
2018-05-18
2018-05-19
2018-05-20
2018-05-21
2018-05-22
2018-05-23
2018-05-24
2018-05-25
2018-05-26
2018-05-27
2018-05-28
2018-05-29
2018-05-30
2018-05-31
2018-06-01
2018-06-02
2018-06-03
2018-06-04
2018-06-05
2018-06-06
2018-06-07
2018-06-08
2018-06-09
2018-06-10
2018-06-11
2018-06-12
2018-06-13
2018-06-14
2018-06-15
2018-06-16
2018-06-17
2018-06-18
2018-06-19
2018-06-20
2018-06-21
2018-06-22
2018-06-23
2018-06-24
2018-06-25
2018-06-26
2018-06-27
2018-06-28
2018-06-29
2018-06-30
2018-07-01
2018-07-02
2018-07-03
2018-07-04
2018-07-05
2018-07-06
2018-07-07
2018-07-08
2018-07-09
2018-07-10
2018-07-11
2018-07-12
2018-07-13
2018-07-14
2018-07-15
2018-07-16
2018-07-17
2018-07-18
2018-07-19
2018-07-20
2018-07-21
2018-07-22
2018-07-23
2018-07-24
2018-07-25
2018-07-26
2018-07-27
2018-07-28
2018-07-29
2018-07-30
2018-07-31
2018-08-01
2018-08-02
2018-08-03
2018-08-04
2018-08-05
2018-08-06
2018-08-07
2018-08-08
2018-08-09
2018-08-10
2018-08-11
2018-08-12
2018-08-13
2018-08-14
2018-08-15
2018-08-16
2018-08-17
2018-08-18
2018-08-19
2018-08-20
2018-08-21
2018-08-22
2018-08-23
2018-08-24
2018-08-25
2018-08-26
2018-08-27
2018-08-28
2018-08-29
2018-08-30
2018-08-31
2018-09-01
2018-09-02
2018-09-03
2018-09-04
2018-09-05
2018-09-06
2018-09-07
2018-09-08
2018-09-09
2018-09-10
2018-09-11
2018-09-12
2018-09-13
2018-09-14
2018-09-15
2018-09-16
2018-09-17
2018-09-18
2018-09-19
2018-09-20
2018-09-21
2018-09-22
2018-09-23
2018-09-24
2018-09-25
2018-09-26
2018-09-27
2018-09-28
2018-09-29
2018-09-30
2018-10-01
2018-10-02
2018-10-03
2018-10-04
2018-10-05
2018-10-06
2018-10-07
2018-10-08
2018-10-09
2018-10-10
2018-10-11
2018-10-12
2018-10-13
2018-10-14
2018-10-15
2018-10-16
2018-10-17
2018-10-18
2018-10-19
2018-10-20
2018-10-21
2018-10-22
2018-10-23
2018-10-24
2018-10-25
2018-10-26
2018-10-27
2018-10-28
2018-10-29
2018-10-30
2018-10-31
2018-11-01
2018-11-02
2018-11-03
2018-11-04
2018-11-05
2018-11-06
2018-11-07
2018-11-08
2018-11-09
2018-11-10
2018-11-11
2018-11-12
2018-11-13
2018-11-14
2018-11-15
2018-11-16
2018-11-17
2018-11-18
2018-11-19
2018-11-20
2018-11-21
2018-11-22
2018-11-23
2018-11-24
2018-11-25
2018-11-26
2018-11-27
2018-11-28
2018-11-29
2018-11-30
2018-12-01
2018-12-02
2018-12-03
2018-12-04
2018-12-05
2018-12-06
2018-12-07
2018-12-08
2018-12-09
2018-12-10
2018-12-11
2018-12-12
2018-12-13
2018-12-14
2018-12-15
2018-12-16
2018-12-17
2018-12-18
2018-12-19
2018-12-20
2018-12-21
2018-12-22
2018-12-23
2018-12-24
2018-12-25
2018-12-26
2018-12-27
2018-12-28
2018-12-29
2018-12-30
2018-12-31
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (order_id, customer_id, order_date, status, credit_card_amount, coupon_amount, bank_transfer_amount, gift_card_amount, amount) FROM stdin;
1	1	2018-01-01	returned	10	0	0	0	10
2	3	2018-01-02	completed	20	0	0	0	20
3	94	2018-01-04	completed	0	1	0	0	1
4	50	2018-01-05	completed	0	25	0	0	25
5	64	2018-01-05	completed	0	0	17	0	17
6	54	2018-01-07	completed	6	0	0	0	6
7	88	2018-01-09	completed	16	0	0	0	16
8	2	2018-01-11	returned	23	0	0	0	23
9	53	2018-01-12	completed	0	0	0	23	23
10	7	2018-01-14	completed	0	0	26	0	26
11	99	2018-01-14	completed	27	0	0	0	27
12	59	2018-01-15	completed	1	0	0	0	1
13	84	2018-01-17	completed	5	0	14	0	19
14	40	2018-01-17	returned	0	0	3	0	3
15	25	2018-01-17	completed	0	22	0	0	22
16	39	2018-01-18	completed	10	0	0	0	10
17	71	2018-01-18	completed	0	0	2	0	2
18	64	2018-01-20	returned	13	0	0	0	13
19	54	2018-01-22	completed	0	0	0	6	6
20	20	2018-01-23	completed	0	0	15	0	15
21	71	2018-01-23	completed	12	0	0	0	12
22	86	2018-01-24	completed	0	0	8	0	8
23	22	2018-01-26	return_pending	0	0	0	23	23
24	3	2018-01-27	completed	0	26	0	0	26
25	51	2018-01-28	completed	22	16	20	0	58
26	32	2018-01-28	completed	30	0	0	0	30
27	94	2018-01-29	completed	23	0	0	0	23
28	8	2018-01-29	completed	0	0	19	0	19
29	57	2018-01-31	completed	0	0	12	0	12
30	69	2018-02-02	completed	13	0	0	0	13
31	16	2018-02-02	completed	12	0	0	0	12
32	28	2018-02-04	completed	3	0	0	0	3
33	42	2018-02-04	completed	22	0	0	0	22
34	38	2018-02-06	completed	0	0	15	0	15
35	80	2018-02-08	completed	29	0	0	0	29
36	85	2018-02-10	completed	0	0	9	0	9
37	1	2018-02-10	completed	23	0	0	0	23
38	51	2018-02-10	completed	15	0	0	0	15
39	26	2018-02-11	completed	0	0	8	0	8
40	33	2018-02-13	completed	14	0	0	0	14
41	99	2018-02-14	completed	17	0	0	0	17
42	92	2018-02-16	completed	0	17	0	0	17
43	31	2018-02-17	completed	0	0	0	18	18
44	66	2018-02-17	completed	0	0	0	11	11
45	22	2018-02-17	completed	0	0	5	0	5
46	6	2018-02-19	completed	0	0	8	0	8
47	50	2018-02-20	completed	22	0	0	0	22
48	27	2018-02-21	completed	0	0	3	0	3
49	35	2018-02-21	completed	15	0	0	0	15
50	51	2018-02-23	completed	26	0	0	0	26
51	71	2018-02-24	completed	30	0	0	0	30
52	54	2018-02-25	return_pending	0	0	15	0	15
53	34	2018-02-26	completed	3	0	0	0	3
54	54	2018-02-26	completed	18	0	11	0	29
55	18	2018-02-27	completed	29	0	0	0	29
56	79	2018-02-28	completed	4	0	0	0	4
57	93	2018-03-01	completed	0	0	2	0	2
58	22	2018-03-01	completed	0	18	0	6	24
59	30	2018-03-02	completed	0	0	0	28	28
60	12	2018-03-03	completed	4	0	0	0	4
61	63	2018-03-03	completed	0	0	16	0	16
62	57	2018-03-05	completed	0	0	0	14	14
63	70	2018-03-06	completed	29	0	0	0	29
64	13	2018-03-07	completed	0	0	26	0	26
65	26	2018-03-08	completed	0	0	0	0	0
66	36	2018-03-10	completed	28	0	0	0	28
67	79	2018-03-11	completed	19	0	4	0	23
68	53	2018-03-11	completed	16	0	0	0	16
69	3	2018-03-11	completed	19	0	0	0	19
70	8	2018-03-12	completed	26	0	0	0	26
71	42	2018-03-12	shipped	5	0	0	0	5
72	30	2018-03-14	shipped	29	0	0	0	29
73	19	2018-03-16	completed	0	0	3	0	3
74	9	2018-03-17	shipped	30	0	0	0	30
75	69	2018-03-18	completed	19	0	0	0	19
76	25	2018-03-20	completed	0	2	0	0	2
77	35	2018-03-21	shipped	0	0	19	0	19
78	90	2018-03-23	shipped	0	0	26	0	26
79	52	2018-03-23	shipped	27	0	0	0	27
80	11	2018-03-23	shipped	0	0	0	3	3
81	76	2018-03-23	shipped	0	2	0	0	2
82	46	2018-03-24	shipped	8	0	0	0	8
83	54	2018-03-24	shipped	1	0	0	0	1
84	70	2018-03-26	placed	0	0	25	0	25
85	47	2018-03-26	shipped	0	0	17	0	17
86	68	2018-03-26	placed	0	23	0	0	23
87	46	2018-03-27	placed	26	0	0	30	56
88	91	2018-03-27	shipped	29	0	0	0	29
89	21	2018-03-28	placed	0	0	22	0	22
90	66	2018-03-30	shipped	0	0	2	0	2
91	47	2018-03-31	placed	19	0	0	0	19
92	84	2018-04-02	placed	0	2	15	0	17
93	66	2018-04-03	placed	0	0	0	26	26
94	63	2018-04-03	placed	0	7	0	0	7
95	27	2018-04-04	placed	0	24	0	0	24
96	90	2018-04-06	placed	0	0	0	17	17
97	89	2018-04-07	placed	0	0	14	0	14
98	41	2018-04-07	placed	0	0	10	0	10
99	85	2018-04-09	placed	24	0	0	0	24
\.


--
-- Data for Name: raw_customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.raw_customers (id, first_name, last_name) FROM stdin;
1	Michael	P.
2	Shawn	M.
3	Kathleen	P.
4	Jimmy	C.
5	Katherine	R.
6	Sarah	R.
7	Martin	M.
8	Frank	R.
9	Jennifer	F.
10	Henry	W.
11	Fred	S.
12	Amy	D.
13	Kathleen	M.
14	Steve	F.
15	Teresa	H.
16	Amanda	H.
17	Kimberly	R.
18	Johnny	K.
19	Virginia	F.
20	Anna	A.
21	Willie	H.
22	Sean	H.
23	Mildred	A.
24	David	G.
25	Victor	H.
26	Aaron	R.
27	Benjamin	B.
28	Lisa	W.
29	Benjamin	K.
30	Christina	W.
31	Jane	G.
32	Thomas	O.
33	Katherine	M.
34	Jennifer	S.
35	Sara	T.
36	Harold	O.
37	Shirley	J.
38	Dennis	J.
39	Louise	W.
40	Maria	A.
41	Gloria	C.
42	Diana	S.
43	Kelly	N.
44	Jane	R.
45	Scott	B.
46	Norma	C.
47	Marie	P.
48	Lillian	C.
49	Judy	N.
50	Billy	L.
51	Howard	R.
52	Laura	F.
53	Anne	B.
54	Rose	M.
55	Nicholas	R.
56	Joshua	K.
57	Paul	W.
58	Kathryn	K.
59	Adam	A.
60	Norma	W.
61	Timothy	R.
62	Elizabeth	P.
63	Edward	G.
64	David	C.
65	Brenda	W.
66	Adam	W.
67	Michael	H.
68	Jesse	E.
69	Janet	P.
70	Helen	F.
71	Gerald	C.
72	Kathryn	O.
73	Alan	B.
74	Harry	A.
75	Andrea	H.
76	Barbara	W.
77	Anne	W.
78	Harry	H.
79	Jack	R.
80	Phillip	H.
81	Shirley	H.
82	Arthur	D.
83	Virginia	R.
84	Christina	R.
85	Theresa	M.
86	Jason	C.
87	Phillip	B.
88	Adam	T.
89	Margaret	J.
90	Paul	P.
91	Todd	W.
92	Willie	O.
93	Frances	R.
94	Gregory	H.
95	Lisa	P.
96	Jacqueline	A.
97	Shirley	D.
98	Nicole	M.
99	Mary	G.
100	Jean	M.
\.


--
-- Data for Name: raw_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.raw_orders (id, user_id, order_date, status) FROM stdin;
1	1	2018-01-01	returned
2	3	2018-01-02	completed
3	94	2018-01-04	completed
4	50	2018-01-05	completed
5	64	2018-01-05	completed
6	54	2018-01-07	completed
7	88	2018-01-09	completed
8	2	2018-01-11	returned
9	53	2018-01-12	completed
10	7	2018-01-14	completed
11	99	2018-01-14	completed
12	59	2018-01-15	completed
13	84	2018-01-17	completed
14	40	2018-01-17	returned
15	25	2018-01-17	completed
16	39	2018-01-18	completed
17	71	2018-01-18	completed
18	64	2018-01-20	returned
19	54	2018-01-22	completed
20	20	2018-01-23	completed
21	71	2018-01-23	completed
22	86	2018-01-24	completed
23	22	2018-01-26	return_pending
24	3	2018-01-27	completed
25	51	2018-01-28	completed
26	32	2018-01-28	completed
27	94	2018-01-29	completed
28	8	2018-01-29	completed
29	57	2018-01-31	completed
30	69	2018-02-02	completed
31	16	2018-02-02	completed
32	28	2018-02-04	completed
33	42	2018-02-04	completed
34	38	2018-02-06	completed
35	80	2018-02-08	completed
36	85	2018-02-10	completed
37	1	2018-02-10	completed
38	51	2018-02-10	completed
39	26	2018-02-11	completed
40	33	2018-02-13	completed
41	99	2018-02-14	completed
42	92	2018-02-16	completed
43	31	2018-02-17	completed
44	66	2018-02-17	completed
45	22	2018-02-17	completed
46	6	2018-02-19	completed
47	50	2018-02-20	completed
48	27	2018-02-21	completed
49	35	2018-02-21	completed
50	51	2018-02-23	completed
51	71	2018-02-24	completed
52	54	2018-02-25	return_pending
53	34	2018-02-26	completed
54	54	2018-02-26	completed
55	18	2018-02-27	completed
56	79	2018-02-28	completed
57	93	2018-03-01	completed
58	22	2018-03-01	completed
59	30	2018-03-02	completed
60	12	2018-03-03	completed
61	63	2018-03-03	completed
62	57	2018-03-05	completed
63	70	2018-03-06	completed
64	13	2018-03-07	completed
65	26	2018-03-08	completed
66	36	2018-03-10	completed
67	79	2018-03-11	completed
68	53	2018-03-11	completed
69	3	2018-03-11	completed
70	8	2018-03-12	completed
71	42	2018-03-12	shipped
72	30	2018-03-14	shipped
73	19	2018-03-16	completed
74	9	2018-03-17	shipped
75	69	2018-03-18	completed
76	25	2018-03-20	completed
77	35	2018-03-21	shipped
78	90	2018-03-23	shipped
79	52	2018-03-23	shipped
80	11	2018-03-23	shipped
81	76	2018-03-23	shipped
82	46	2018-03-24	shipped
83	54	2018-03-24	shipped
84	70	2018-03-26	placed
85	47	2018-03-26	shipped
86	68	2018-03-26	placed
87	46	2018-03-27	placed
88	91	2018-03-27	shipped
89	21	2018-03-28	placed
90	66	2018-03-30	shipped
91	47	2018-03-31	placed
92	84	2018-04-02	placed
93	66	2018-04-03	placed
94	63	2018-04-03	placed
95	27	2018-04-04	placed
96	90	2018-04-06	placed
97	89	2018-04-07	placed
98	41	2018-04-07	placed
99	85	2018-04-09	placed
\.


--
-- Data for Name: raw_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.raw_payments (id, order_id, payment_method, amount) FROM stdin;
1	1	credit_card	1000
2	2	credit_card	2000
3	3	coupon	100
4	4	coupon	2500
5	5	bank_transfer	1700
6	6	credit_card	600
7	7	credit_card	1600
8	8	credit_card	2300
9	9	gift_card	2300
10	9	bank_transfer	0
11	10	bank_transfer	2600
12	11	credit_card	2700
13	12	credit_card	100
14	13	credit_card	500
15	13	bank_transfer	1400
16	14	bank_transfer	300
17	15	coupon	2200
18	16	credit_card	1000
19	17	bank_transfer	200
20	18	credit_card	500
21	18	credit_card	800
22	19	gift_card	600
23	20	bank_transfer	1500
24	21	credit_card	1200
25	22	bank_transfer	800
26	23	gift_card	2300
27	24	coupon	2600
28	25	bank_transfer	2000
29	25	credit_card	2200
30	25	coupon	1600
31	26	credit_card	3000
32	27	credit_card	2300
33	28	bank_transfer	1900
34	29	bank_transfer	1200
35	30	credit_card	1300
36	31	credit_card	1200
37	32	credit_card	300
38	33	credit_card	2200
39	34	bank_transfer	1500
40	35	credit_card	2900
41	36	bank_transfer	900
42	37	credit_card	2300
43	38	credit_card	1500
44	39	bank_transfer	800
45	40	credit_card	1400
46	41	credit_card	1700
47	42	coupon	1700
48	43	gift_card	1800
49	44	gift_card	1100
50	45	bank_transfer	500
51	46	bank_transfer	800
52	47	credit_card	2200
53	48	bank_transfer	300
54	49	credit_card	600
55	49	credit_card	900
56	50	credit_card	2600
57	51	credit_card	2900
58	51	credit_card	100
59	52	bank_transfer	1500
60	53	credit_card	300
61	54	credit_card	1800
62	54	bank_transfer	1100
63	55	credit_card	2900
64	56	credit_card	400
65	57	bank_transfer	200
66	58	coupon	1800
67	58	gift_card	600
68	59	gift_card	2800
69	60	credit_card	400
70	61	bank_transfer	1600
71	62	gift_card	1400
72	63	credit_card	2900
73	64	bank_transfer	2600
74	65	credit_card	0
75	66	credit_card	2800
76	67	bank_transfer	400
77	67	credit_card	1900
78	68	credit_card	1600
79	69	credit_card	1900
80	70	credit_card	2600
81	71	credit_card	500
82	72	credit_card	2900
83	73	bank_transfer	300
84	74	credit_card	3000
85	75	credit_card	1900
86	76	coupon	200
87	77	credit_card	0
88	77	bank_transfer	1900
89	78	bank_transfer	2600
90	79	credit_card	1800
91	79	credit_card	900
92	80	gift_card	300
93	81	coupon	200
94	82	credit_card	800
95	83	credit_card	100
96	84	bank_transfer	2500
97	85	bank_transfer	1700
98	86	coupon	2300
99	87	gift_card	3000
100	87	credit_card	2600
101	88	credit_card	2900
102	89	bank_transfer	2200
103	90	bank_transfer	200
104	91	credit_card	1900
105	92	bank_transfer	1500
106	92	coupon	200
107	93	gift_card	2600
108	94	coupon	700
109	95	coupon	2400
110	96	gift_card	1700
111	97	bank_transfer	1400
112	98	bank_transfer	1000
113	99	credit_card	2400
\.


--
-- PostgreSQL database dump complete
--


