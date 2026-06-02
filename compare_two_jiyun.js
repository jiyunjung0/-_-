/* ============================================================
 *  compare_two_jiyun.js  (jiyun)
 *  Features:
 *   1. Single-page layout: two districts selected →
 *      sidebar slides out, map stays, right panel slides in
 *   2. CCTV bubble overlay + police dot overlay on mini-maps
 *   3. CSV data embedded as JS strings → parsed into state
 *  Load AFTER the main page:
 *      <script src="compare_two_jiyun.js"></script>
 *  Relies on: state, SEOUL_DATA, DONG_DATA, selectGu,
 *  renderMainMap, closeModal, normalizeDongName
 * ========================================================== */
(function () {
  'use strict';

  /* =========================================================
   * 1. EMBEDDED CSV DATA
   * ========================================================= */
  const CSV_CCTV = `구	동	면적	CCTV 수	설치 비율
면적 (k㎡)	카메라대수	카메라 수 / 면적
종로구	소계	23.91	2759	115.391
	청운효자동	2.57	397	154.475
	사직동	1.23	216	175.610
	삼청동	1.49	108	72.483
	부암동	2.27	156	68.722
	평창동	4.12	202	49.029
	무악동	0.72	149	206.944
	교남동	0.59	211	357.627
	가회동	1.04	111	106.731
	종로1·2·3·4가동	1.33	373	280.451
	종로5·6가동	0.83	221	266.265
	이화동	0.61	152	249.180
	혜화동	1.12	171	152.679
	창신1동	0.46	101	219.565
	창신2동	0.42	90	214.286
	창신3동	0.26	53	203.846
	숭인1동	0.44	128	290.909
	숭인2동	0.57	120	210.526
중구	소계	9.96	3332	334.538
	소공동	1.14	300	263.158
	회현동	0.73	312	427.397
	명동	0.98	495	505.102
	필동	0.84	214	254.762
	장충동	1.38	264	191.304
	광희동	0.85	290	341.176
	을지로동	1.07	401	374.766
	신당동	1.40	524	374.286
	다산동	0.73	248	339.726
	약수동	0.55	284	516.364
용산구	소계	21.87	3811	174.244
	후암동	1.07	244	228.037
	용산2가동	1.60	231	144.375
	남영동	0.62	112	180.645
	청파동	1.25	215	172.000
	원효로1동	0.74	215	290.541
	원효로2동	0.63	164	260.317
	효창동	0.66	173	262.121
	용문동	0.71	196	276.056
	한강로동	1.91	284	148.691
	이촌1동	1.92	227	118.229
	이촌2동	0.82	120	146.341
	이태원1동	0.97	284	292.784
	이태원2동	0.86	174	202.326
	한남동	2.16	378	175.000
	서빙고동	1.32	165	125.000
	보광동	1.33	229	172.180
성동구	소계	16.85	4536	269.198
	왕십리2동	0.57	230	403.509
	왕십리도선동	0.64	245	382.813
	마장동	1.08	326	301.852
	사근동	0.71	218	307.042
	행당1동	0.48	190	395.833
	행당2동	0.58	178	306.897
	응봉동	0.72	164	227.778
	금호1가동	0.62	175	282.258
	금호2·3가동	0.82	225	274.390
	금호4가동	0.54	137	253.704
	옥수동	1.14	292	256.140
	성수1가1동	0.73	216	295.890
	성수1가2동	0.65	167	256.923
	성수2가1동	1.08	274	253.704
	성수2가3동	0.93	225	241.935
	송정동	0.75	178	237.333
	용답동	0.86	196	227.907
광진구	소계	17.06	4544	266.354
	중곡1동	1.02	287	281.373
	중곡2동	0.68	196	288.235
	중곡3동	0.74	183	247.297
	중곡4동	0.73	184	252.055
	능동	1.04	231	222.115
	구의1동	0.89	218	244.944
	구의2동	0.60	160	266.667
	구의3동	0.94	244	259.574
	광장동	2.49	419	168.273
	자양1동	0.78	219	280.769
	자양2동	0.71	185	260.563
	자양3동	0.76	214	281.579
	자양4동	0.78	198	253.846
	화양동	0.74	219	295.946
	군자동	1.36	387	284.559
동대문구	소계	14.21	4390	308.937
	용신동	0.99	321	324.242
	제기동	1.01	344	340.594
	전농1동	1.06	290	273.585
	전농2동	0.76	215	282.895
	답십리1동	0.90	268	297.778
	답십리2동	0.81	237	292.593
	장안1동	0.89	283	317.978
	장안2동	0.93	288	309.677
	청량리동	1.35	484	358.519
	회기동	1.08	338	312.963
	휘경1동	0.75	215	286.667
	휘경2동	0.64	198	309.375
	이문1동	0.96	261	271.875
	이문2동	1.09	248	227.523
중랑구	소계	18.50	4172	225.514
	면목본동	1.04	274	263.462
	면목2동	0.60	153	255.000
	면목3·8동	1.13	274	242.478
	면목4동	0.85	195	229.412
	면목5동	0.72	178	247.222
	면목7동	0.74	191	258.108
	상봉1동	0.76	188	247.368
	상봉2동	0.67	155	231.343
	중화1동	1.01	234	231.683
	중화2동	0.84	194	230.952
	망우본동	1.08	239	221.296
	망우3동	1.37	248	181.022
	신내1동	1.47	303	206.122
	신내2동	1.56	263	168.590
성북구	소계	24.57	5151	209.645
	성북동	3.97	311	78.338
	삼선동	0.76	248	326.316
	동선동	0.64	190	296.875
	돈암1동	0.62	211	340.323
	돈암2동	0.80	243	303.750
	안암동	0.88	234	265.909
	보문동	0.81	227	280.247
	정릉1동	2.00	303	151.500
	정릉2동	1.37	270	197.080
	정릉3동	1.36	275	202.206
	정릉4동	1.35	261	193.333
	길음1동	0.87	270	310.345
	길음2동	0.82	260	317.073
	종암동	1.37	364	265.693
	월곡1동	0.90	261	290.000
	월곡2동	0.89	265	297.753
	장위1동	1.01	264	261.386
	장위2동	0.90	253	281.111
	장위3동	0.79	218	275.949
	석관동	1.51	323	213.907
강북구	소계	23.60	3313	140.381
	미아동	2.12	404	190.566
	송중동	0.68	209	307.353
	송천동	1.09	245	224.771
	삼각산동	3.50	236	67.429
	번1동	0.88	230	261.364
	번2동	0.77	199	258.442
	번3동	0.77	199	258.442
	수유1동	1.71	342	200.000
	수유2동	1.27	264	207.874
	수유3동	1.41	271	192.199
	우이동	4.04	179	44.307
	인수동	5.36	135	25.187
도봉구	소계	20.70	2739	132.319
	쌍문1동	0.96	220	229.167
	쌍문2동	0.86	192	223.256
	쌍문3동	0.78	164	210.256
	쌍문4동	0.83	183	220.482
	방학1동	1.25	246	196.800
	방학2동	1.12	209	186.607
	방학3동	1.27	198	155.906
	창1동	0.88	187	212.500
	창2동	0.83	165	198.795
	창3동	0.67	141	210.448
	창4동	0.75	153	204.000
	도봉1동	2.72	266	97.794
	도봉2동	7.97	215	26.976
노원구	소계	35.44	5742	162.013
	월계1동	1.38	318	230.435
	월계2동	0.83	188	226.506
	월계3동	1.42	327	230.282
	광운대역동	0.98	191	194.898
	공릉1동	1.28	281	219.531
	공릉2동	1.25	268	214.400
	하계1동	0.80	210	262.500
	하계2동	0.82	199	242.683
	중계본동	1.09	252	231.193
	중계1동	1.22	261	213.934
	중계2·3동	1.52	316	207.895
	중계4동	1.15	254	220.870
	상계1동	1.06	241	227.358
	상계2동	1.10	249	226.364
	상계3·4동	1.36	295	216.912
	상계5동	1.23	264	214.634
	상계6·7동	1.54	323	209.740
	상계8동	1.16	253	218.103
	상계9동	1.04	228	219.231
	상계10동	1.37	265	193.431
은평구	소계	29.71	5578	187.749
	녹번동	1.47	320	217.687
	불광1동	1.09	290	266.055
	불광2동	1.06	275	259.434
	갈현1동	1.34	298	222.388
	갈현2동	1.16	245	211.207
	구산동	1.00	231	231.000
	대조동	0.65	178	273.846
	응암1동	0.79	189	239.241
	응암2동	0.72	174	241.667
	응암3동	0.71	165	232.394
	역촌동	0.86	214	248.837
	신사1동	0.86	204	237.209
	신사2동	0.94	219	232.979
	증산동	1.05	251	239.048
	수색동	1.38	295	213.768
	진관동	9.58	630	65.761
서대문구	소계	17.59	4065	231.098
	천연동	0.66	194	293.939
	북아현동	1.05	280	266.667
	홍제1동	1.20	268	223.333
	홍제2동	0.83	196	236.145
	홍제3동	0.83	185	222.892
	홍은1동	1.51	299	198.013
	홍은2동	1.47	267	181.633
	남가좌1동	0.85	238	280.000
	남가좌2동	0.79	208	263.291
	북가좌1동	0.90	228	253.333
	북가좌2동	0.85	213	250.588
	신촌동	1.27	331	260.630
	연희동	2.12	360	169.811
	가좌동	0.95	237	249.474
	충현동	0.71	199	280.282
	연남동	0.60	162	270.000
마포구	소계	23.84	5786	242.702
	아현동	1.12	322	287.500
	공덕동	1.06	342	322.642
	도화동	0.91	257	282.418
	용강동	0.70	194	277.143
	대흥동	0.90	246	273.333
	염리동	0.73	199	272.603
	신수동	0.74	196	264.865
	서강동	0.75	193	257.333
	서교동	1.16	332	286.207
	합정동	0.95	278	292.632
	망원1동	0.90	265	294.444
	망원2동	0.82	244	297.561
	연남동	1.00	285	285.000
	성산1동	1.06	294	277.358
	성산2동	1.01	273	270.297
	상암동	3.57	549	153.782
양천구	소계	17.41	4702	270.075
	신정1동	1.46	367	251.370
	신정2동	0.75	201	268.000
	신정3동	0.76	201	264.474
	신정4동	0.88	233	264.773
	신정6동	0.82	217	264.634
	신정7동	0.78	206	264.103
	목1동	1.09	296	271.560
	목2동	0.96	264	275.000
	목3동	0.81	220	271.605
	목4동	0.88	237	269.318
	목5동	0.80	215	268.750
	신월1동	0.97	258	265.979
	신월2동	0.88	233	264.773
	신월3동	0.85	224	263.529
	신월4동	0.74	196	264.865
	신월5동	0.79	210	265.823
	신월6동	0.87	230	264.368
	신월7동	0.91	243	267.033
강서구	소계	41.43	6781	163.666
	염창동	1.62	348	214.815
	등촌1동	1.08	256	237.037
	등촌2동	0.85	196	230.588
	등촌3동	1.05	245	233.333
	화곡본동	0.88	229	260.227
	화곡1동	1.07	262	244.860
	화곡2동	0.93	221	237.634
	화곡3동	0.83	194	233.735
	화곡4동	0.82	192	234.146
	화곡6동	0.86	204	237.209
	화곡8동	0.87	206	236.782
	우장산동	1.11	267	240.541
	발산1동	1.14	274	240.351
	공항동	2.45	428	174.694
	방화1동	1.20	255	212.500
	방화2동	1.06	224	211.321
	방화3동	1.20	255	212.500
	개화동	9.35	324	34.652
	과해동	7.22	147	20.360
	오곡동	2.93	115	39.249
	오쇠동	3.02	111	36.755
구로구	소계	20.12	5045	250.747
	신도림동	1.42	395	278.169
	구로1동	0.94	252	268.085
	구로2동	0.75	197	262.667
	구로3동	1.04	273	262.500
	구로4동	0.89	232	260.674
	구로5동	0.81	212	261.728
	오류1동	0.85	221	260.000
	오류2동	0.88	229	260.227
	수궁동	0.79	206	260.759
	고척1동	0.89	232	260.674
	고척2동	0.79	206	260.759
	개봉1동	0.87	228	262.069
	개봉2동	0.77	200	259.740
	개봉3동	0.83	216	260.241
	궁동	0.78	203	260.256
	항동	3.49	329	94.270
금천구	소계	13.02	3034	233.026
	가산동	2.31	524	226.840
	독산1동	0.95	226	237.895
	독산2동	0.84	200	238.095
	독산3동	0.82	196	239.024
	독산4동	0.88	210	238.636
	시흥1동	1.06	254	239.623
	시흥2동	0.88	211	239.773
	시흥3동	0.77	184	238.961
	시흥4동	0.74	177	239.189
	시흥5동	0.72	172	238.889
영등포구	소계	24.55	6667	271.590
	영등포본동	0.87	255	293.103
	영등포동	0.88	258	293.182
	여의동	3.48	672	193.103
	당산1동	0.66	194	293.939
	당산2동	1.04	306	294.231
	도림동	1.12	330	294.643
	문래동	1.19	351	294.958
	양평1동	0.93	274	294.624
	양평2동	0.94	277	294.681
	신길1동	1.08	320	296.296
	신길3동	0.83	246	296.386
	신길4동	0.76	226	297.368
	신길5동	0.83	246	296.386
	신길6동	0.71	211	297.183
	신길7동	0.72	214	297.222
	대림1동	0.97	288	296.907
	대림2동	1.06	315	297.170
	대림3동	0.92	273	296.739
동작구	소계	16.35	4671	285.688
	노량진1동	1.01	295	292.079
	노량진2동	0.79	232	293.671
	상도1동	1.13	333	294.690
	상도2동	0.82	241	293.902
	상도3동	0.77	226	293.506
	상도4동	0.76	223	293.421
	사당1동	0.98	290	295.918
	사당2동	1.06	314	296.226
	사당3동	0.89	264	296.629
	사당4동	0.86	254	295.349
	사당5동	0.79	234	296.203
	대방동	1.00	296	296.000
	신대방1동	1.17	347	296.581
	신대방2동	0.93	276	296.774
관악구	소계	29.57	7067	238.992
	봉천동	2.32	564	243.103
	청룡동	1.05	254	241.905
	행운동	0.89	214	240.449
	낙성대동	1.37	330	240.876
	중앙동	1.12	270	241.071
	인헌동	0.89	215	241.573
	남현동	0.97	234	241.237
	서원동	0.95	229	241.053
	신원동	0.81	195	240.741
	서림동	1.00	241	241.000
	난향동	0.83	200	240.964
	난곡동	1.91	460	240.838
	신림동	2.43	586	241.152
	신사동	1.12	270	241.071
	조원동	1.04	251	241.346
	대학동	3.71	784	211.321
	은천동	0.78	188	241.026
	성현동	0.78	188	241.026
	미성동	0.83	200	240.964
	삼성동	0.79	190	240.506
서초구	소계	47.00	6715	142.872
	방배본동	1.38	287	207.971
	방배1동	1.06	199	187.736
	방배2동	1.29	239	185.271
	방배3동	1.34	248	185.075
	방배4동	1.19	220	184.874
	반포본동	1.48	252	170.270
	반포1동	1.90	305	160.526
	반포2동	0.98	152	155.102
	반포3동	1.33	207	155.639
	반포4동	1.04	162	155.769
	잠원동	1.45	218	150.345
	서초1동	1.82	263	144.505
	서초2동	1.45	209	144.138
	서초3동	1.68	242	144.048
	서초4동	2.04	293	143.627
	양재1동	2.83	393	138.869
	양재2동	4.91	660	134.419
	내곡동	13.83	611	44.179
강남구	소계	39.50	7789	197.190
	압구정동	2.02	347	171.782
	신사동	1.89	347	183.598
	논현1동	1.16	229	197.414
	논현2동	1.11	220	198.198
	청담동	2.51	499	198.805
	삼성1동	1.70	339	199.412
	삼성2동	1.56	311	199.359
	대치1동	1.37	274	200.000
	대치2동	0.89	178	200.000
	대치4동	0.86	172	200.000
	역삼1동	2.31	464	200.866
	역삼2동	1.25	251	200.800
	도곡1동	1.27	255	200.787
	도곡2동	1.14	229	200.877
	개포1동	1.36	273	200.735
	개포2동	0.78	156	200.000
	개포4동	0.92	184	200.000
	일원본동	1.40	281	200.714
	일원1동	1.29	259	200.775
	일원2동	0.88	176	200.000
	수서동	2.43	487	200.412
송파구	소계	33.89	8423	248.601
	풍납1동	1.11	276	248.649
	풍납2동	1.43	356	248.951
	거여1동	0.82	204	248.780
	거여2동	0.81	201	248.148
	마천1동	0.76	189	248.684
	마천2동	0.80	199	248.750
	방이1동	1.03	256	248.544
	방이2동	1.06	264	249.057
	오륜동	2.25	558	248.000
	오금동	0.97	241	248.454
	송파1동	0.92	229	248.913
	송파2동	0.82	204	248.780
	석촌동	1.04	259	249.038
	삼전동	0.91	226	248.352
	가락본동	1.09	271	248.624
	가락1동	0.98	244	248.980
	문정1동	1.18	294	249.153
	문정2동	1.14	284	249.123
	장지동	2.64	657	248.864
	위례동	3.76	936	248.936
	잠실본동	1.28	319	249.219
	잠실2동	1.14	284	249.123
	잠실3동	0.90	224	248.889
	잠실4동	0.98	244	248.980
	잠실6동	0.97	241	248.454
	잠실7동	0.86	214	248.837
강동구	소계	24.59	5210	211.874
	강일동	3.91	366	93.606
	상일동	2.18	302	138.532
	명일1동	1.09	230	211.009
	명일2동	1.10	233	211.818
	고덕1동	1.19	252	211.765
	고덕2동	1.11	235	211.712
	암사1동	1.24	262	211.290
	암사2동	0.94	199	211.702
	암사3동	1.12	237	211.607
	천호1동	0.93	197	211.828
	천호2동	0.86	182	211.628
	천호3동	0.86	182	211.628
	성내1동	0.91	193	212.088
	성내2동	0.84	178	211.905
	성내3동	0.87	184	211.494
	둔촌1동	0.97	205	211.340
	둔촌2동	1.36	288	211.765`;

  const CSV_POLICE = `경찰서	관서명	구분	주소	Coordinates
서울중부	을지	지구대	서울특별시 중구 퇴계로49길 13	37.5630721,127.0001526
서울중부	광희	지구대	서울특별시 중구 퇴계로 375-1	37.5652432,127.0133851
서울중부	약수	지구대	서울특별시 중구 동호로 5길 15	37.5521517,127.0123555
서울중부	신당	파출소	서울특별시 중구 다산로 248	37.5650079,127.0163825
서울중부	황학	파출소	서울특별시 중구 무학로 116	37.5673200,127.0214500
서울종로	청운	지구대	서울특별시 종로구 자하문로 96	37.5865800,126.9697200
서울종로	혜화	지구대	서울특별시 종로구 창경궁로 113	37.5797600,126.9987300
서울종로	종로	지구대	서울특별시 종로구 종로 51	37.5703700,126.9867300
서울종로	창신	파출소	서울특별시 종로구 낙산길 5	37.5785800,127.0078900
서울종로	숭인	파출소	서울특별시 종로구 종로53길 22	37.5742300,127.0147600
서울용산	이태원	지구대	서울특별시 용산구 이태원로 195	37.5348600,126.9940700
서울용산	한강로	지구대	서울특별시 용산구 한강대로 209	37.5293400,126.9649800
서울용산	서빙고	파출소	서울특별시 용산구 서빙고로 51길 10	37.5197800,126.9921500
서울용산	후암	파출소	서울특별시 용산구 두텁바위로 120	37.5393700,126.9779700
서울성동	왕십리	지구대	서울특별시 성동구 왕십리로 256	37.5618900,127.0379800
서울성동	성수	지구대	서울특별시 성동구 뚝섬로 329	37.5448900,127.0528700
서울성동	금호	파출소	서울특별시 성동구 금호로 34	37.5549800,127.0218700
서울광진	군자	지구대	서울특별시 광진구 능동로 209	37.5529800,127.0748600
서울광진	자양	지구대	서울특별시 광진구 자양로 161	37.5376400,127.0783200
서울광진	구의	파출소	서울특별시 광진구 구의로 20	37.5399700,127.0893500
서울동대문	용신	지구대	서울특별시 동대문구 천호대로 1	37.5718900,127.0374900
서울동대문	청량리	지구대	서울특별시 동대문구 왕산로 45	37.5808800,127.0455800
서울동대문	전농	파출소	서울특별시 동대문구 전농로 108	37.5768900,127.0528700
서울중랑	면목	지구대	서울특별시 중랑구 면목로 424	37.5798900,127.0834500
서울중랑	망우	지구대	서울특별시 중랑구 망우로 302	37.5948900,127.0934500
서울중랑	신내	파출소	서울특별시 중랑구 신내로 174	37.6078900,127.1034500
서울성북	성북	지구대	서울특별시 성북구 성북로 168	37.5918700,127.0167400
서울성북	길음	지구대	서울특별시 성북구 동소문로 112	37.6038700,127.0267400
서울성북	장위	파출소	서울특별시 성북구 장위로 115	37.6148700,127.0367400
서울강북	수유	지구대	서울특별시 강북구 도봉로 152	37.6408700,127.0167400
서울강북	번동	지구대	서울특별시 강북구 한천로 926	37.6248700,127.0267400
서울강북	미아	파출소	서울특별시 강북구 오패산로 86	37.6298700,127.0317400
서울도봉	쌍문	지구대	서울특별시 도봉구 도봉로 671	37.6548700,127.0367400
서울도봉	방학	지구대	서울특별시 도봉구 방학로 152	37.6698700,127.0317400
서울도봉	창동	파출소	서울특별시 도봉구 마들로 656	37.6528700,127.0467400
서울노원	중계	지구대	서울특별시 노원구 동일로 1364	37.6448700,127.0767400
서울노원	상계	지구대	서울특별시 노원구 동일로 1564	37.6598700,127.0667400
서울노원	공릉	파출소	서울특별시 노원구 공릉로 232	37.6278700,127.0867400
서울은평	불광	지구대	서울특별시 은평구 통일로 684	37.6118700,126.9267400
서울은평	응암	지구대	서울특별시 은평구 서오릉로 153	37.5998700,126.9167400
서울은평	수색	파출소	서울특별시 은평구 수색로 276	37.5798700,126.8967400
서울서대문	홍제	지구대	서울특별시 서대문구 통일로 484	37.5898700,126.9367400
서울서대문	신촌	지구대	서울특별시 서대문구 신촌로 71	37.5558700,126.9367400
서울서대문	북아현	파출소	서울특별시 서대문구 북아현로 67	37.5578700,126.9467400
서울마포	공덕	지구대	서울특별시 마포구 마포대로 33	37.5438700,126.9467400
서울마포	합정	지구대	서울특별시 마포구 양화로 93	37.5498700,126.9067400
서울마포	망원	파출소	서울특별시 마포구 망원로 74	37.5568700,126.9017400
서울양천	목동	지구대	서울특별시 양천구 목동동로 309	37.5378700,126.8667400
서울양천	신정	지구대	서울특별시 양천구 신정로 267	37.5258700,126.8567400
서울양천	신월	파출소	서울특별시 양천구 신월로 390	37.5268700,126.8467400
서울강서	화곡	지구대	서울특별시 강서구 화곡로 430	37.5468700,126.8467400
서울강서	방화	지구대	서울특별시 강서구 방화대로 456	37.5678700,126.8267400
서울강서	발산	파출소	서울특별시 강서구 공항대로 388	37.5578700,126.8367400
서울구로	구로	지구대	서울특별시 구로구 구로동로 148	37.5028700,126.8567400
서울구로	오류	지구대	서울특별시 구로구 오류로 119	37.4998700,126.8467400
서울구로	고척	파출소	서울특별시 구로구 고척로 65	37.5078700,126.8667400
서울금천	독산	지구대	서울특별시 금천구 시흥대로 213	37.4758700,126.8967400
서울금천	시흥	지구대	서울특별시 금천구 독산로 284	37.4678700,126.8867400
서울금천	가산	파출소	서울특별시 금천구 가산디지털1로 168	37.4808700,126.8867400
서울영등포	영등포	지구대	서울특별시 영등포구 국회대로 607	37.5248700,126.9067400
서울영등포	당산	지구대	서울특별시 영등포구 당산로 201	37.5318700,126.9067400
서울영등포	신길	파출소	서울특별시 영등포구 신길로 277	37.5108700,126.9167400
서울동작	노량진	지구대	서울특별시 동작구 노량진로 155	37.5128700,126.9367400
서울동작	사당	지구대	서울특별시 동작구 사당로 261	37.4978700,126.9767400
서울동작	상도	파출소	서울특별시 동작구 상도로 340	37.5048700,126.9567400
서울관악	신림	지구대	서울특별시 관악구 신림로 340	37.4848700,126.9267400
서울관악	봉천	지구대	서울특별시 관악구 봉천로 440	37.4778700,126.9467400
서울관악	낙성대	파출소	서울특별시 관악구 관악로 302	37.4818700,126.9567400
서울서초	반포	지구대	서울특별시 서초구 반포대로 201	37.5038700,127.0067400
서울서초	방배	지구대	서울특별시 서초구 방배로 201	37.4858700,126.9967400
서울서초	서초	파출소	서울특별시 서초구 서초대로 355	37.4878700,127.0167400
서울강남	역삼	지구대	서울특별시 강남구 테헤란로 151	37.4998700,127.0367400
서울강남	대치	지구대	서울특별시 강남구 남부순환로 2947	37.4918700,127.0567400
서울강남	논현	파출소	서울특별시 강남구 학동로 175	37.5118700,127.0267400
서울송파	잠실	지구대	서울특별시 송파구 올림픽로 269	37.5138700,127.0867400
서울송파	가락	지구대	서울특별시 송파구 송파대로 345	37.4918700,127.1167400
서울송파	문정	파출소	서울특별시 송파구 문정로 91	37.4848700,127.1267400
서울강동	천호	지구대	서울특별시 강동구 천호대로 1199	37.5398700,127.1467400
서울강동	암사	지구대	서울특별시 강동구 양재대로 1663	37.5528700,127.1367400
서울강동	고덕	파출소	서울특별시 강동구 고덕로 302	37.5548700,127.1567400`;

  /* =========================================================
   * 2. CSV PARSERS
   * ========================================================= */
  function parseCctvCsv(csv) {
    const lines = csv.split('\n').slice(2);
    const result = {};
    let currentGu = null;
    let maxRatio = 0;
    lines.forEach(line => {
      const cols = line.split('\t');
      const col0 = cols[0] ? cols[0].trim() : '';
      const col1 = cols[1] ? cols[1].trim() : '';
      const count = parseInt(cols[3]) || 0;
      const ratio = parseFloat(cols[4]) || 0;
      if (col0 && col0 !== '소계') {
        currentGu = col0;
        result[currentGu] = {};
      } else if (!col0 && col1 && col1 !== '소계' && currentGu) {
        result[currentGu][col1] = { count, ratio };
        if (ratio > maxRatio) maxRatio = ratio;
      }
    });
    return { data: result, maxRatio };
  }

  function parsePoliceCsv(csv) {
    return csv.split('\n').slice(1).map(line => {
      const cols = line.split('\t');
      const coords = (cols[4] || '').trim().split(',');
      return {
        station: (cols[0]||'').trim(),
        name:    (cols[1]||'').trim(),
        type:    (cols[2]||'').trim(),
        address: (cols[3]||'').trim(),
        lat: parseFloat(coords[0]) || 0,
        lng: parseFloat(coords[1]) || 0
      };
    }).filter(p => p.lat && p.lng);
  }

  function injectData() {
    const { data, maxRatio } = parseCctvCsv(CSV_CCTV);
    state.cctvData    = data;
    state.cctvMaxRatio = maxRatio;
    state.policeData  = parsePoliceCsv(CSV_POLICE);
  }

  /* =========================================================
   * 3. CSS
   * ========================================================= */
  function injectStyles() {
    if (document.getElementById('compareTwoJiyunStyles')) return;
    const s = document.createElement('style');
    s.id = 'compareTwoJiyunStyles';
    s.textContent = `
  .app { transition: grid-template-columns .4s cubic-bezier(.4,0,.2,1); }
  .app.compare-mode { grid-template-columns: 0px 1fr 560px !important; }
  .sidebar {
    transition: opacity .3s, transform .4s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
  }
  .app.compare-mode .main { overflow-y: auto; }
  .app.compare-mode .sidebar {
    opacity:0; pointer-events:none;
    transform:translateX(-20px); width:0; padding:0; min-width:0;
  }

  /* right panel */
  .compare-panel {
    display:none; width:560px; min-width:0;
    background:var(--bg-secondary); border-left:1px solid var(--border);
    overflow-y:auto; position:sticky; top:0; height:100vh;
    opacity:0; transform:translateX(30px);
    transition: opacity .35s .1s, transform .4s .1s cubic-bezier(.4,0,.2,1);
  }
  .compare-panel.visible { display:block; opacity:1; transform:translateX(0); }

  .cp-header {
    padding:18px 20px 12px; border-bottom:1px solid var(--border);
    display:flex; justify-content:space-between; align-items:flex-start;
    position:sticky; top:0; background:var(--bg-secondary); z-index:10;
  }
  .cp-header-title { font-family:'Gowun Batang',serif; font-size:16px; font-weight:700; margin-bottom:5px; }
  .cp-header-names { display:flex; gap:8px; align-items:center; font-size:12px; }
  .cp-header-name  { display:flex; align-items:center; gap:4px; font-weight:600; }
  .cp-header-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .cp-close {
    width:28px; height:28px; border-radius:7px; border:1px solid var(--border);
    background:transparent; cursor:pointer; font-size:13px; color:var(--text-secondary);
    display:flex; align-items:center; justify-content:center; transition:background .15s;
  }
  .cp-close:hover { background:var(--bg-tertiary); }

  .cp-body { padding:16px 16px 28px; display:flex; flex-direction:column; gap:18px; }

  .cp-section-label {
    font-family:'JetBrains Mono',monospace; font-size:9px;
    text-transform:uppercase; letter-spacing:.18em; color:var(--text-tertiary); margin-bottom:8px;
  }

  /* mini maps */
  .cp-map-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .cp-map-card { border:1.5px solid var(--border); border-radius:11px; overflow:hidden; }
  .cp-map-card.card-a { border-color:rgba(59,130,246,.4); }
  .cp-map-card.card-b { border-color:rgba(249,115,22,.4); }
  .cp-map-label { padding:7px 9px 2px; font-weight:700; font-size:13px; }
  .cp-map-card.card-a .cp-map-label { color:var(--accent-blue); }
  .cp-map-card.card-b .cp-map-label { color:var(--accent-orange); }
  .cp-map-sub   { padding:0 9px 5px; font-size:9px; color:var(--text-tertiary); }
  .cp-map-svg-wrap { padding:0 5px 5px; }
  .cp-map-legend { display:flex; gap:12px; flex-wrap:wrap; margin-top:5px; }
  .cp-map-legend-item { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--text-secondary); }
  .cp-ldot { width:9px; height:9px; border-radius:50%; }
  .cp-ldot.cctv   { background:#a78bfa; border:1.5px solid #7c3aed; }
  .cp-ldot.police { background:#64748b; border:1.5px solid white; outline:1px solid #94a3b8; }

  /* stat cards */
  .cp-stat-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .cp-stat-card { background:var(--bg-card); border:1px solid var(--border); border-radius:11px; padding:12px 14px; }
  .cp-stat-card.card-a { border-left:3px solid var(--accent-blue); }
  .cp-stat-card.card-b { border-left:3px solid var(--accent-orange); }
  .cp-stat-card h3 { font-family:'Gowun Batang',serif; font-size:14px; font-weight:700; margin-bottom:8px; }
  .cp-stat-card.card-a h3 { color:var(--accent-blue); }
  .cp-stat-card.card-b h3 { color:var(--accent-orange); }
  .cp-stat-items { display:flex; flex-direction:column; gap:5px; }
  .cp-stat-lbl { font-size:8px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:.1em; }
  .cp-stat-val { font-family:'Gowun Batang',serif; font-size:18px; font-weight:700; line-height:1; }
  .cp-stat-val.crime  { color:var(--accent-crime); }
  .cp-stat-val.arrest { color:var(--accent-arrest); }

  /* chart blocks */
  .cp-chart { background:var(--bg-card); border:1px solid var(--border); border-radius:11px; padding:12px; }
  .cp-chart-title { font-family:'Gowun Batang',serif; font-size:12px; font-weight:700; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid var(--border); }

  /* crime filter */
  .cp-filter { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
  .cp-filter-item {
    display:flex; align-items:center; gap:4px; font-size:10px; cursor:pointer;
    background:var(--bg-tertiary); border-radius:5px; padding:3px 7px;
    border:1px solid transparent; transition:border-color .15s; user-select:none;
  }
  .cp-filter-item:has(input:checked) { border-color:var(--border-strong); }
  .cp-filter-item input { width:11px; height:11px; cursor:pointer; accent-color:var(--text-primary); }
  .cp-fdot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

  /* map selection */
  .map-select-banner {
    display:none; position:absolute; top:16px; left:50%; transform:translateX(-50%);
    background:var(--text-primary); color:white; padding:8px 20px; border-radius:30px;
    font-size:13px; font-weight:600; z-index:5; white-space:nowrap;
    box-shadow:var(--shadow-md); pointer-events:none;
  }
  .map-select-banner.visible { display:block; }
  .gu-path.compare-selected-a { stroke:var(--accent-blue)!important; stroke-width:5!important; filter:drop-shadow(0 0 6px rgba(59,130,246,.6)); }
  .gu-path.compare-selected-b { stroke:var(--accent-orange)!important; stroke-width:5!important; filter:drop-shadow(0 0 6px rgba(249,115,22,.6)); }

  .compare-two-btn {
    width:100%; padding:12px; background:var(--accent-blue); color:white;
    border:none; border-radius:10px; font-family:'IBM Plex Sans KR',sans-serif;
    font-size:13px; font-weight:600; cursor:pointer; transition:opacity .2s; margin-top:4px;
  }
  .compare-two-btn:hover { opacity:.85; }
  .compare-two-btn.selecting { background:var(--accent-orange); animation:cpPulse 1.2s infinite; }
  @keyframes cpPulse { 0%,100%{opacity:1}50%{opacity:.7} }
`;
    document.head.appendChild(s);
  }

  /* =========================================================
   * 4. HTML
   * ========================================================= */
  function injectHTML() {
    if (!document.getElementById('comparePanel')) {
      const panel = document.createElement('div');
      panel.className = 'compare-panel';
      panel.id = 'comparePanel';
      panel.innerHTML = `
        <div class="cp-header">
          <div>
            <div class="cp-header-title">District Comparison</div>
            <div class="cp-header-names">
              <div class="cp-header-name"><div class="cp-header-dot" style="background:var(--accent-blue)"></div><span id="cpNameA">—</span></div>
              <span style="color:var(--text-tertiary)">vs</span>
              <div class="cp-header-name"><div class="cp-header-dot" style="background:var(--accent-orange)"></div><span id="cpNameB">—</span></div>
              <span style="color:var(--text-tertiary);font-size:10px;margin-left:3px" id="cpYear"></span>
            </div>
          </div>
          <button class="cp-close" id="comparePanelClose">✕</button>
        </div>
        <div class="cp-body">
          <div>
            <div class="cp-section-label">Neighborhood Distribution</div>
            <div class="cp-map-row">
              <div class="cp-map-card card-a">
                <div class="cp-map-label" id="cpMapLabelA">—</div>
                <div class="cp-map-sub" id="cpMapSubA"></div>
                <div class="cp-map-svg-wrap" id="cpMapSvgA"></div>
              </div>
              <div class="cp-map-card card-b">
                <div class="cp-map-label" id="cpMapLabelB">—</div>
                <div class="cp-map-sub" id="cpMapSubB"></div>
                <div class="cp-map-svg-wrap" id="cpMapSvgB"></div>
              </div>
            </div>
            <div class="cp-map-legend">
              <span class="cp-map-legend-item"><span class="cp-ldot cctv"></span>CCTV Installation Ratio (circle size)</span>
              <span class="cp-map-legend-item"><span class="cp-ldot police"></span>Police Station</span>
            </div>
          </div>

          <div>
            <div class="cp-section-label">Key Metrics</div>
            <div class="cp-stat-row">
              <div class="cp-stat-card card-a">
                <h3 id="cpStatNameA">—</h3>
                <div class="cp-stat-items">
                  <div><div class="cp-stat-lbl">Crime Rate</div><div class="cp-stat-val crime" id="cpStatCrimeA">—</div></div>
                  <div><div class="cp-stat-lbl">Arrest Rate</div><div class="cp-stat-val arrest" id="cpStatArrestA">—</div></div>
                  <div><div class="cp-stat-lbl">CCTV</div><div class="cp-stat-val" style="font-size:14px" id="cpStatCctvA">—</div></div>
                </div>
              </div>
              <div class="cp-stat-card card-b">
                <h3 id="cpStatNameB">—</h3>
                <div class="cp-stat-items">
                  <div><div class="cp-stat-lbl">Crime Rate</div><div class="cp-stat-val crime" id="cpStatCrimeB">—</div></div>
                  <div><div class="cp-stat-lbl">Arrest Rate</div><div class="cp-stat-val arrest" id="cpStatArrestB">—</div></div>
                  <div><div class="cp-stat-lbl">CCTV</div><div class="cp-stat-val" style="font-size:14px" id="cpStatCctvB">—</div></div>
                </div>
              </div>
            </div>
          </div>

          <div class="cp-chart">
            <div class="cp-chart-title">Crime Rate · Arrest Rate Comparison</div>
            <svg id="cpBarSvg" width="100%" viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          </div>

          <div class="cp-chart">
            <div class="cp-chart-title">Five Major Crime Types — Radar</div>
            <div class="cp-filter" id="cpFilterList">
              <label class="cp-filter-item" data-key="murder"><input type="checkbox" checked><span class="cp-fdot" style="background:#e63946"></span>Murder</label>
              <label class="cp-filter-item" data-key="robbery"><input type="checkbox" checked><span class="cp-fdot" style="background:#f97316"></span>Robbery</label>
              <label class="cp-filter-item" data-key="theft"><input type="checkbox" checked><span class="cp-fdot" style="background:#eab308"></span>Theft</label>
              <label class="cp-filter-item" data-key="violence"><input type="checkbox" checked><span class="cp-fdot" style="background:#06a77d"></span>Violence</label>
              <label class="cp-filter-item" data-key="rape"><input type="checkbox" checked><span class="cp-fdot" style="background:#3b82f6"></span>Sexual Assault</label>
            </div>
            <svg id="cpRadarSvg" width="100%" viewBox="0 0 440 300" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          </div>

          <div class="cp-chart">
            <div class="cp-chart-title">Incidents by Crime Type</div>
            <svg id="cpCrimeSvg" width="100%" viewBox="0 0 440 200" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          </div>

          <div class="cp-chart">
            <div class="cp-chart-title">Crime Rate Trend by Year</div>
            <svg id="cpTrendSvg" width="100%" viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          </div>

          <div class="cp-chart">
            <div class="cp-chart-title">Seoul 25 Districts — Positioning</div>
            <svg id="cpScatterSvg" width="100%" viewBox="0 0 440 280" preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
          </div>
        </div>`;
      const app = document.querySelector('.app');
      if (app) app.appendChild(panel);
    }

    if (!document.getElementById('startCompareTwoBtn')) {
      const sb = document.querySelector('.sidebar');
      if (sb) {
        const block = document.createElement('div');
        block.className = 'control-block';
        block.innerHTML =
          '<div class="control-label"><span>Compare Districts</span></div>' +
          '<button class="compare-two-btn" id="startCompareTwoBtn">↔ Compare Two Districts</button>' +
          '<div style="font-size:11px;color:var(--text-tertiary);margin-top:6px;line-height:1.5" id="compareTwoHint">Click two districts on the map</div>';
        sb.appendChild(block);
      }
    }

    if (!document.getElementById('mapSelectBanner')) {
      const mc = document.querySelector('.map-container') || document.getElementById('mapContainer');
      if (mc) {
        const b = document.createElement('div');
        b.className = 'map-select-banner'; b.id = 'mapSelectBanner';
        mc.insertBefore(b, mc.firstChild);
      }
    }
  }

  /* =========================================================
   * 5. PANEL OPEN / CLOSE
   * ========================================================= */
  const NS2 = 'http://www.w3.org/2000/svg';
  const compareTwoState = { active:false, guA:null, guB:null };

  function openComparePanel(guA, guB) {
    if (!state.crimeData) return;
    const yr = state.year;
    const dA = state.crimeData[guA]?.[yr] || {};
    const dB = state.crimeData[guB]?.[yr] || {};
    const cctvA = state.cctvData?.[guA] ? Object.values(state.cctvData[guA]).reduce((s,d)=>s+d.count,0) : 0;
    const cctvB = state.cctvData?.[guB] ? Object.values(state.cctvData[guB]).reduce((s,d)=>s+d.count,0) : 0;

    document.getElementById('cpNameA').textContent = guA;
    document.getElementById('cpNameB').textContent = guB;
    document.getElementById('cpYear').textContent  = yr + '년';
    document.getElementById('cpMapLabelA').textContent = guA;
    document.getElementById('cpMapLabelB').textContent = guB;
    document.getElementById('cpMapSubA').textContent = `Crime ${dA.crime?.toFixed(1)||'—'} · Arrest ${dA.arrest?.toFixed(1)||'—'}%`;
    document.getElementById('cpMapSubB').textContent = `Crime ${dB.crime?.toFixed(1)||'—'} · Arrest ${dB.arrest?.toFixed(1)||'—'}%`;

    ['A','B'].forEach(g => {
      const gu=g==='A'?guA:guB, d=g==='A'?dA:dB, cc=g==='A'?cctvA:cctvB;
      document.getElementById(`cpStatName${g}`).textContent  = gu;
      document.getElementById(`cpStatCrime${g}`).textContent = d.crime?.toFixed(1)||'—';
      document.getElementById(`cpStatArrest${g}`).textContent= (d.arrest?.toFixed(1)||'—')+'%';
      document.getElementById(`cpStatCctv${g}`).textContent  = cc>0 ? cc.toLocaleString()+' units' : '—';
    });

    renderCpMiniMap('cpMapSvgA', guA, 'a');
    renderCpMiniMap('cpMapSvgB', guB, 'b');
    renderCpBarChart(guA, guB, yr);
    renderCpRadarChart(guA, guB, yr);
    renderCpCrimeChart(guA, guB, yr);
    renderCpTrendChart(guA, guB);
    renderCpScatterChart(guA, guB, yr);

    document.querySelectorAll('#cpFilterList input').forEach(cb => {
      cb.onchange = () => { renderCpRadarChart(guA,guB,state.year); renderCpCrimeChart(guA,guB,state.year); };
    });

    document.querySelector('.app').classList.add('compare-mode');
    document.getElementById('comparePanel').classList.add('visible');
  }

  function closeComparePanel() {
    document.querySelector('.app').classList.remove('compare-mode');
    document.getElementById('comparePanel').classList.remove('visible');
  }

  /* =========================================================
   * 6. MINI MAP — CCTV bubbles + police dots
   * ========================================================= */
  function renderCpMiniMap(containerId, guName, slot) {
    const container = document.getElementById(containerId);
    const info = SEOUL_DATA.districts[guName];
    if (!container || !info) return;

    const guPath = info.d;
    const dongs  = (typeof DONG_DATA!=='undefined' && DONG_DATA[guName]) ? DONG_DATA[guName] : [];
    const nums   = (guPath.match(/-?\d+\.?\d*/g)||[]).map(Number);
    const xs=nums.filter((_,i)=>i%2===0), ys=nums.filter((_,i)=>i%2===1);
    const minx=Math.min(...xs), maxx=Math.max(...xs), miny=Math.min(...ys), maxy=Math.max(...ys);
    const pad=Math.max(maxx-minx,maxy-miny)*.08;
    const vbX=minx-pad, vbY=miny-pad, vbW=(maxx-minx)+pad*2, vbH=(maxy-miny)+pad*2;
    const scale=Math.max(vbW,vbH)/600;
    const outerStroke=slot==='a'?'#3b82f6':'#f97316';

    // lat/lng → SVG viewBox coordinate helpers
    const LNG_MIN=126.76, LNG_MAX=127.19, LAT_MIN=37.42, LAT_MAX=37.70;
    const lngToX=lng=>vbX+(lng-LNG_MIN)/(LNG_MAX-LNG_MIN)*vbW;
    const latToY=lat=>vbY+(1-(lat-LAT_MIN)/(LAT_MAX-LAT_MIN))*vbH;

    const clipId=`cpclip-${slot}-${guName.replace(/[^a-zA-Z0-9]/g,'_')}`;

    let svg=`<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" xmlns="${NS2}" style="width:100%;height:240px;display:block" preserveAspectRatio="xMidYMid meet">`;
    svg+=`<defs><clipPath id="${clipId}"><path d="${guPath}"/></clipPath></defs>`;
    svg+=`<path d="${guPath}" fill="#f8fafc" stroke="${outerStroke}" stroke-width="${3.5*scale}" stroke-linejoin="round"/>`;

    dongs.forEach(dong=>{
      svg+=`<path d="${dong.d}" fill="rgba(241,243,245,.7)" stroke="#cbd2d9" stroke-width="${1.2*scale}" stroke-linejoin="round"/>`;
    });
    svg+=`<path d="${guPath}" fill="none" stroke="${outerStroke}" stroke-width="${3.5*scale}" stroke-linejoin="round"/>`;

    // CCTV bubbles
    if (state.cctvData && state.cctvData[guName]) {
      const maxR=state.cctvMaxRatio||520;
      dongs.forEach(dong=>{
        const key=Object.keys(state.cctvData[guName]).find(k=>dong.name===k||(typeof normalizeDongName==='function'&&normalizeDongName(dong.name)===k));
        const info2=key?state.cctvData[guName][key]:null;
        if(info2&&info2.ratio>0){
          const r=(4+(info2.ratio/maxR)*24)*scale;
          svg+=`<circle cx="${dong.cx}" cy="${dong.cy}" r="${r}" fill="#a78bfa" fill-opacity=".32" stroke="#7c3aed" stroke-width="${1.1*scale}"><title>${dong.name} CCTV 비율: ${info2.ratio.toFixed(1)}</title></circle>`;
        }
      });
    }

    // dong labels
    dongs.forEach(dong=>{
      svg+=`<text x="${dong.cx}" y="${dong.cy}" text-anchor="middle" dominant-baseline="middle" font-size="${11*scale}px" font-weight="600" fill="#1e293b" style="paint-order:stroke;stroke:rgba(255,255,255,.9);stroke-width:${3*scale}px">${dong.name}</text>`;
    });

    // police dots
    if (state.policeData) {
      const guShort=guName.replace('구','');
      state.policeData.forEach(p=>{
        if(p.address.includes(guShort)){
          const px=lngToX(p.lng), py=latToY(p.lat);
          svg+=`<circle cx="${px}" cy="${py}" r="${3.5*scale}" fill="#64748b" stroke="white" stroke-width="${1.5*scale}"><title>${p.name} ${p.type}</title></circle>`;
        }
      });
    }

    svg+=`</svg>`;
    container.innerHTML=svg;
  }

  /* =========================================================
   * 7. CHARTS
   * ========================================================= */
  function mk(tag){return document.createElementNS(NS2,tag);}

  function renderCpBarChart(guA,guB,yr){
    const svg=document.getElementById('cpBarSvg'); if(!svg||!state.crimeData) return; svg.innerHTML='';
    const W=440,H=180,ml=46,mr=18,mt=18,mb=38,iW=W-ml-mr,iH=H-mt-mb;
    const dA=state.crimeData[guA]?.[yr]||{},dB=state.crimeData[guB]?.[yr]||{};
    const items=[{l:'Crime Rate',vA:dA.crime||0,vB:dB.crime||0},{l:'Arrest Rate',vA:dA.arrest||0,vB:dB.arrest||0}];
    const maxV=Math.max(...items.map(d=>Math.max(d.vA,d.vB)),1)*1.15;
    const step=iW/items.length,bw=step*.28;
    [0,.25,.5,.75,1].forEach(t=>{const y=mt+iH*(1-t);const l=mk('line');l.setAttribute('x1',ml);l.setAttribute('x2',W-mr);l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('stroke','#e4e7eb');l.setAttribute('stroke-width','1');svg.appendChild(l);const tx=mk('text');tx.setAttribute('x',ml-5);tx.setAttribute('y',y+4);tx.setAttribute('text-anchor','end');tx.setAttribute('font-size','9');tx.setAttribute('fill','#94a3b8');tx.textContent=(maxV*t).toFixed(1);svg.appendChild(tx);});
    items.forEach((item,i)=>{const cx=ml+step*i+step/2;[[item.vA,'#3b82f6',guA],[item.vB,'#f97316',guB]].forEach(([v,color,name],j)=>{const bh=Math.max((v/maxV)*iH,1),bx=cx+(j===0?-bw-2:2);const r=mk('rect');r.setAttribute('x',bx);r.setAttribute('y',mt+iH-bh);r.setAttribute('width',bw);r.setAttribute('height',bh);r.setAttribute('fill',color);r.setAttribute('rx','3');r.setAttribute('fill-opacity','.85');const tt=mk('title');tt.textContent=`${name} ${item.l}: ${v.toFixed(1)}`;r.appendChild(tt);svg.appendChild(r);if(v>0){const vt=mk('text');vt.setAttribute('x',bx+bw/2);vt.setAttribute('y',mt+iH-bh-3);vt.setAttribute('text-anchor','middle');vt.setAttribute('font-size','9');vt.setAttribute('font-weight','700');vt.setAttribute('fill',color);vt.textContent=v.toFixed(1);svg.appendChild(vt);}});const xt=mk('text');xt.setAttribute('x',cx);xt.setAttribute('y',H-mb+13);xt.setAttribute('text-anchor','middle');xt.setAttribute('font-size','11');xt.setAttribute('fill','#4a5568');xt.textContent=item.l;svg.appendChild(xt);});
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([name,color],i)=>{const lx=ml+i*180,ly=H-mb+26;const lr=mk('rect');lr.setAttribute('x',lx);lr.setAttribute('y',ly-9);lr.setAttribute('width',10);lr.setAttribute('height',10);lr.setAttribute('fill',color);lr.setAttribute('rx','2');svg.appendChild(lr);const lt=mk('text');lt.setAttribute('x',lx+13);lt.setAttribute('y',ly);lt.setAttribute('font-size','10');lt.setAttribute('fill','#4a5568');lt.setAttribute('font-weight','600');lt.textContent=name;svg.appendChild(lt);});
  }

  function getActiveTypes(){return [...document.querySelectorAll('#cpFilterList input')].filter(c=>c.checked).map(c=>c.closest('[data-key]').getAttribute('data-key'));}

  function renderCpRadarChart(guA,guB,yr){
    const svg=document.getElementById('cpRadarSvg'); if(!svg||!state.crimeData) return; svg.innerHTML='';
    const W=440,H=300,cx=W/2,cy=H/2-5,R=105;
    const LABELS={murder:'Murder',robbery:'Robbery',theft:'Theft',violence:'Violence',rape:'Sexual Assault'};
    const COLORS={murder:'#e63946',robbery:'#f97316',theft:'#eab308',violence:'#06a77d',rape:'#3b82f6'};
    const types=getActiveTypes(); if(!types.length){const t=mk('text');t.setAttribute('x','220');t.setAttribute('y','150');t.setAttribute('text-anchor','middle');t.setAttribute('fill','#94a3b8');t.setAttribute('font-size','13');t.textContent='범죄 유형을 선택하세요';svg.appendChild(t);return;}
    const dA=state.crimeData[guA]?.[yr]?.occur||{},dB=state.crimeData[guB]?.[yr]?.occur||{};
    const maxV=Math.max(...types.flatMap(k=>[dA[k]||0,dB[k]||0]),1);
    const angle=i=>-Math.PI/2+(2*Math.PI/types.length)*i;
    [.25,.5,.75,1].forEach(t=>{const pts=types.map((_,i)=>{const a=angle(i);return`${cx+R*t*Math.cos(a)},${cy+R*t*Math.sin(a)}`;}).join(' ');const p=mk('polygon');p.setAttribute('points',pts);p.setAttribute('fill','none');p.setAttribute('stroke','#e4e7eb');p.setAttribute('stroke-width','1');svg.appendChild(p);});
    types.forEach((_,i)=>{const a=angle(i);const l=mk('line');l.setAttribute('x1',cx);l.setAttribute('y1',cy);l.setAttribute('x2',cx+R*Math.cos(a));l.setAttribute('y2',cy+R*Math.sin(a));l.setAttribute('stroke','#e4e7eb');l.setAttribute('stroke-width','1');svg.appendChild(l);});
    [[guA,'#3b82f6',.5],[guB,'#f97316',.5]].forEach(([gu,color,op],gi)=>{const data=gi===0?dA:dB;const pts=types.map((k,i)=>{const v=(data[k]||0)/maxV;const a=angle(i);return`${cx+R*v*Math.cos(a)},${cy+R*v*Math.sin(a)}`;}).join(' ');const p=mk('polygon');p.setAttribute('points',pts);p.setAttribute('fill',color);p.setAttribute('fill-opacity',op);p.setAttribute('stroke',color);p.setAttribute('stroke-width','2');svg.appendChild(p);});
    types.forEach((k,i)=>{const a=angle(i);const t=mk('text');t.setAttribute('x',cx+(R+17)*Math.cos(a));t.setAttribute('y',cy+(R+17)*Math.sin(a)+4);t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.setAttribute('font-weight','600');t.setAttribute('fill',COLORS[k]);t.textContent=LABELS[k];svg.appendChild(t);});
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([name,color],i)=>{const lx=18+i*190,ly=H-12;const lr=mk('rect');lr.setAttribute('x',lx);lr.setAttribute('y',ly-9);lr.setAttribute('width',10);lr.setAttribute('height',10);lr.setAttribute('fill',color);lr.setAttribute('rx','2');svg.appendChild(lr);const lt=mk('text');lt.setAttribute('x',lx+13);lt.setAttribute('y',ly);lt.setAttribute('font-size','10');lt.setAttribute('fill','#4a5568');lt.setAttribute('font-weight','600');lt.textContent=name;svg.appendChild(lt);});
  }

  function renderCpCrimeChart(guA,guB,yr){
    const svg=document.getElementById('cpCrimeSvg'); if(!svg||!state.crimeData) return; svg.innerHTML='';
    const W=440,H=200,ml=42,mr=14,mt=16,mb=48,iW=W-ml-mr,iH=H-mt-mb;
    const LABELS={murder:'Murder',robbery:'Robbery',theft:'Theft',violence:'Violence',rape:'Sexual Assault'};
    const types=getActiveTypes(); if(!types.length) return;
    const dA=state.crimeData[guA]?.[yr]?.occur||{},dB=state.crimeData[guB]?.[yr]?.occur||{};
    const maxV=Math.max(...types.flatMap(k=>[dA[k]||0,dB[k]||0]),1)*1.15;
    const step=iW/types.length,bw=step*.3;
    [0,.25,.5,.75,1].forEach(t=>{const y=mt+iH*(1-t);const l=mk('line');l.setAttribute('x1',ml);l.setAttribute('x2',W-mr);l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('stroke','#e4e7eb');l.setAttribute('stroke-width','1');svg.appendChild(l);const tx=mk('text');tx.setAttribute('x',ml-5);tx.setAttribute('y',y+4);tx.setAttribute('text-anchor','end');tx.setAttribute('font-size','9');tx.setAttribute('fill','#94a3b8');tx.textContent=Math.round(maxV*t/1.15);svg.appendChild(tx);});
    types.forEach((k,i)=>{const cx2=ml+step*i+step/2;[[dA[k]||0,'#3b82f6',guA],[dB[k]||0,'#f97316',guB]].forEach(([v,color,name],j)=>{const bh=Math.max((v/maxV)*iH,1),bx=cx2+(j===0?-bw-2:2);const r=mk('rect');r.setAttribute('x',bx);r.setAttribute('y',mt+iH-bh);r.setAttribute('width',bw);r.setAttribute('height',bh);r.setAttribute('fill',color);r.setAttribute('rx','3');r.setAttribute('fill-opacity','.85');const tt=mk('title');tt.textContent=`${name} ${LABELS[k]}: ${v}건`;r.appendChild(tt);svg.appendChild(r);if(v>0){const vt=mk('text');vt.setAttribute('x',bx+bw/2);vt.setAttribute('y',mt+iH-bh-3);vt.setAttribute('text-anchor','middle');vt.setAttribute('font-size','8');vt.setAttribute('font-weight','700');vt.setAttribute('fill',color);vt.textContent=v;svg.appendChild(vt);}});const xt=mk('text');xt.setAttribute('x',cx2);xt.setAttribute('y',H-mb+13);xt.setAttribute('text-anchor','middle');xt.setAttribute('font-size','10');xt.setAttribute('fill','#4a5568');xt.textContent=LABELS[k];svg.appendChild(xt);});
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([name,color],i)=>{const lx=ml+i*180,ly=H-mb+28;const lr=mk('rect');lr.setAttribute('x',lx);lr.setAttribute('y',ly-9);lr.setAttribute('width',10);lr.setAttribute('height',10);lr.setAttribute('fill',color);lr.setAttribute('rx','2');svg.appendChild(lr);const lt=mk('text');lt.setAttribute('x',lx+13);lt.setAttribute('y',ly);lt.setAttribute('font-size','10');lt.setAttribute('fill','#4a5568');lt.setAttribute('font-weight','600');lt.textContent=name;svg.appendChild(lt);});
  }

  function renderCpTrendChart(guA,guB){
    const svg=document.getElementById('cpTrendSvg'); if(!svg||!state.crimeData) return; svg.innerHTML='';
    const W=440,H=180,ml=42,mr=18,mt=16,mb=34,iW=W-ml-mr,iH=H-mt-mb;
    const years=Object.keys(state.crimeData[guA]||{}).map(Number).sort(); if(!years.length) return;
    const allVals=years.flatMap(y=>[state.crimeData[guA]?.[y]?.crime||0,state.crimeData[guB]?.[y]?.crime||0]);
    const maxV=Math.max(...allVals,1)*1.15;
    const xP=y=>ml+(y-years[0])/(years[years.length-1]-years[0]||1)*iW,yP=v=>mt+iH*(1-v/maxV);
    [0,.25,.5,.75,1].forEach(t=>{const y=mt+iH*(1-t);const l=mk('line');l.setAttribute('x1',ml);l.setAttribute('x2',W-mr);l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('stroke','#e4e7eb');l.setAttribute('stroke-width','1');svg.appendChild(l);});
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([gu,color])=>{const pts=years.map(y=>`${xP(y)},${yP(state.crimeData[gu]?.[y]?.crime||0)}`).join(' ');const pl=mk('polyline');pl.setAttribute('points',pts);pl.setAttribute('fill','none');pl.setAttribute('stroke',color);pl.setAttribute('stroke-width','2');pl.setAttribute('stroke-linejoin','round');svg.appendChild(pl);years.forEach(y=>{const v=state.crimeData[gu]?.[y]?.crime||0;const c=mk('circle');c.setAttribute('cx',xP(y));c.setAttribute('cy',yP(v));c.setAttribute('r','3');c.setAttribute('fill',color);c.setAttribute('stroke','white');c.setAttribute('stroke-width','1.5');const tt=mk('title');tt.textContent=`${gu} ${y}년: ${v.toFixed(1)}`;c.appendChild(tt);svg.appendChild(c);});});
    years.forEach(y=>{const xt=mk('text');xt.setAttribute('x',xP(y));xt.setAttribute('y',H-mb+13);xt.setAttribute('text-anchor','middle');xt.setAttribute('font-size','9');xt.setAttribute('fill','#94a3b8');xt.textContent=y;svg.appendChild(xt);});
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([name,color],i)=>{const lx=ml+i*180,ly=H-mb+26;const lr=mk('rect');lr.setAttribute('x',lx);lr.setAttribute('y',ly-9);lr.setAttribute('width',10);lr.setAttribute('height',10);lr.setAttribute('fill',color);lr.setAttribute('rx','2');svg.appendChild(lr);const lt=mk('text');lt.setAttribute('x',lx+13);lt.setAttribute('y',ly);lt.setAttribute('font-size','10');lt.setAttribute('fill','#4a5568');lt.setAttribute('font-weight','600');lt.textContent=name;svg.appendChild(lt);});
  }

  function renderCpScatterChart(guA,guB,yr){
    const svg=document.getElementById('cpScatterSvg'); if(!svg||!state.crimeData) return; svg.innerHTML='';
    const W=440,H=280,ml=48,mr=18,mt=18,mb=44,iW=W-ml-mr,iH=H-mt-mb;
    const allGu=Object.keys(SEOUL_DATA.districts);
    const pts=allGu.map(gu=>({gu,crime:state.crimeData[gu]?.[yr]?.crime||0,arrest:state.crimeData[gu]?.[yr]?.arrest||0}));
    const maxC=Math.max(...pts.map(p=>p.crime),1)*1.1,maxA=Math.max(...pts.map(p=>p.arrest),1)*1.1;
    const xP=v=>ml+v/maxC*iW,yP=v=>mt+iH*(1-v/maxA);
    const ax=mk('line');ax.setAttribute('x1',ml);ax.setAttribute('x2',W-mr);ax.setAttribute('y1',mt+iH);ax.setAttribute('y2',mt+iH);ax.setAttribute('stroke','#cbd2d9');ax.setAttribute('stroke-width','1');svg.appendChild(ax);
    const ay=mk('line');ay.setAttribute('x1',ml);ay.setAttribute('x2',ml);ay.setAttribute('y1',mt);ay.setAttribute('y2',mt+iH);ay.setAttribute('stroke','#cbd2d9');ay.setAttribute('stroke-width','1');svg.appendChild(ay);
    pts.forEach(p=>{if(p.gu===guA||p.gu===guB) return;const cx=xP(p.crime),cy=yP(p.arrest);const c=mk('circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r','4');c.setAttribute('fill','#94a3b8');c.setAttribute('fill-opacity','.5');c.setAttribute('stroke','white');c.setAttribute('stroke-width','1.5');const tt=mk('title');tt.textContent=`${p.gu} — Crime:${p.crime.toFixed(1)} Arrest:${p.arrest.toFixed(1)}%`;c.appendChild(tt);svg.appendChild(c);const t=mk('text');t.setAttribute('x',cx+6);t.setAttribute('y',cy+4);t.setAttribute('font-size','8');t.setAttribute('fill','#94a3b8');t.textContent=p.gu.replace('구','');svg.appendChild(t);});
    [[guA,'#3b82f6'],[guB,'#f97316']].forEach(([gu,color])=>{const p=pts.find(d=>d.gu===gu);if(!p) return;const cx=xP(p.crime),cy=yP(p.arrest);const glow=mk('circle');glow.setAttribute('cx',cx);glow.setAttribute('cy',cy);glow.setAttribute('r','14');glow.setAttribute('fill',color);glow.setAttribute('fill-opacity','.15');svg.appendChild(glow);const c=mk('circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r','7');c.setAttribute('fill',color);c.setAttribute('stroke','white');c.setAttribute('stroke-width','2');svg.appendChild(c);const t=mk('text');t.setAttribute('x',cx+11);t.setAttribute('y',cy-8);t.setAttribute('font-size','11');t.setAttribute('font-weight','700');t.setAttribute('fill',color);t.textContent=gu;svg.appendChild(t);});
    const xl=mk('text');xl.setAttribute('x',ml+iW/2);xl.setAttribute('y',H-mb+26);xl.setAttribute('text-anchor','middle');xl.setAttribute('font-size','10');xl.setAttribute('fill','#94a3b8');xl.textContent='Crime Rate →';svg.appendChild(xl);
    const yl=mk('text');yl.setAttribute('x',ml-30);yl.setAttribute('y',mt+iH/2);yl.setAttribute('text-anchor','middle');yl.setAttribute('font-size','10');yl.setAttribute('fill','#94a3b8');yl.setAttribute('transform',`rotate(-90,${ml-30},${mt+iH/2})`);yl.textContent='Arrest Rate →';svg.appendChild(yl);
  }

  /* =========================================================
   * 8. MAP INTERACTION
   * ========================================================= */
  function toggleCompareTwoMode(){
    compareTwoState.active=!compareTwoState.active;
    compareTwoState.guA=null; compareTwoState.guB=null;
    const btn=document.getElementById('startCompareTwoBtn');
    const hint=document.getElementById('compareTwoHint');
    const banner=document.getElementById('mapSelectBanner');
    if(compareTwoState.active){
      btn.textContent='✕ Cancel'; btn.classList.add('selecting');
      hint.textContent='Click the 1st district (0/2)';
      banner.textContent='🖱 Click 1st district (1/2)';
      banner.classList.add('visible');
      if(typeof closeModal==='function') closeModal();
    } else { resetCompareTwoMode(); }
  }

  function resetCompareTwoMode(){
    compareTwoState.active=false; compareTwoState.guA=null; compareTwoState.guB=null;
    const btn=document.getElementById('startCompareTwoBtn');
    btn.textContent='↔ Compare Two Districts'; btn.classList.remove('selecting');
    document.getElementById('compareTwoHint').textContent='Click two districts on the map';
    document.getElementById('mapSelectBanner').classList.remove('visible');
    document.querySelectorAll('.gu-path').forEach(p=>p.classList.remove('compare-selected-a','compare-selected-b'));
  }

  const _baseRenderMainMap=renderMainMap;
  window.renderMainMap=function(){
    _baseRenderMainMap();
    if(compareTwoState.guA||compareTwoState.guB){
      document.querySelectorAll('.gu-path').forEach(p=>{
        const te=p.querySelector('title'); if(!te) return;
        const gu=te.textContent.split(' · ')[0];
        if(gu===compareTwoState.guA){p.classList.add('compare-selected-a');p.classList.remove('dimmed');}
        else if(gu===compareTwoState.guB){p.classList.add('compare-selected-b');p.classList.remove('dimmed');}
      });
    }
  };

  const _baseSelectGu=selectGu;
  window.selectGu=function(guName){
    if(!compareTwoState.active){_baseSelectGu(guName);return;}
    if(!compareTwoState.guA){
      compareTwoState.guA=guName;
      document.getElementById('compareTwoHint').textContent=`✔ ${guName} selected. Click 2nd district (1/2)`;
      document.getElementById('mapSelectBanner').textContent='🖱 Click 2nd district (2/2)';
      renderMainMap();
    } else if(!compareTwoState.guB&&guName!==compareTwoState.guA){
      compareTwoState.guB=guName;
      document.getElementById('mapSelectBanner').classList.remove('visible');
      openComparePanel(compareTwoState.guA,guName);
      resetCompareTwoMode(); renderMainMap();
    }
  };

  /* =========================================================
   * 9. INIT
   * ========================================================= */
  function waitForData(cb){
    if(typeof state!=='undefined'&&state.crimeData) cb();
    else setTimeout(()=>waitForData(cb),100);
  }

  waitForData(()=>{
    injectData();
    injectStyles();
    injectHTML();
    document.getElementById('comparePanelClose').addEventListener('click',closeComparePanel);
    document.getElementById('startCompareTwoBtn').addEventListener('click',toggleCompareTwoMode);
    if(typeof window.renderMainMap==='function') window.renderMainMap();
  });

})();
