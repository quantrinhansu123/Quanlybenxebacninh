const fs = require('fs');

// Clean useChoXeVaoBenForm
let file = 'D:\\Quanlybenxebacninh\\client\\src\\hooks\\useChoXeVaoBenForm.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ fetchSchedulesFromAppsheetTbJoin \} from "@\/services\/appsheet-fetch-schedules-tb-join";\n?/g, '');
code = code.replace(/,\n\s*ScheduleDataSource/g, '');
code = code.replace(/ScheduleDataSource,/g, '');

code = code.replace(/const \[isLoadingTbJoinSchedules, setIsLoadingTbJoinSchedules\] = useState\(false\);\n?/g, '');
code = code.replace(/const scheduleDataSource = useDispatchStore\(\(s\) => s\.scheduleDataSource\);\n?/g, '');
code = code.replace(/const setScheduleDataSource = useDispatchStore\(\(s\) => s\.setScheduleDataSource\);\n?/g, '');

code = code.replace(/Record<string, \{ items: Schedule\[\]; source: ScheduleDataSource \}>/g, 'Record<string, { items: Schedule[] }>');
code = code.replace(/const scheduleCacheKey = [^;]+;\n/g, '');

let loadSchedulesStart = code.indexOf('const loadSchedules = useCallback(');
let loadSchedulesEnd = code.indexOf('  useEffect(() => {\n    if (routeId)');

let newLoadSchedules = `const loadSchedules = useCallback(
    async (rid: string) => {
      const opId = vehicleOperatorId || undefined;
      try {
        const cacheKey = \`\${opId ? \`\${rid}_\${opId}\` : rid}\`;
        const hit = schedulesCacheRef.current[cacheKey];
        if (hit) {
          setSchedules(hit.items);
          return;
        }

        const data = await scheduleService.getAll(rid, opId, true, "Đi");
        const list = Array.isArray(data) ? data : [];
        setSchedules(list);
        schedulesCacheRef.current[cacheKey] = { items: list };
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    },
    [routes, vehicleOperatorId],
  );\n\n`;

code = code.substring(0, loadSchedulesStart) + newLoadSchedules + code.substring(loadSchedulesEnd);

let appsheetFuncsStart = code.indexOf('  const handleScheduleDataSourceChange');
let appsheetFuncsEnd = code.indexOf('  const handleVehicleSelect');
code = code.substring(0, appsheetFuncsStart) + code.substring(appsheetFuncsEnd);

code = code.replace(/setScheduleDataSource\("database"\);\n?\s*/g, '');

code = code.replace(/loadSchedulesFromAppsheetTbJoin,\n?\s*/g, '');
code = code.replace(/isLoadingTbJoinSchedules,\n?\s*/g, '');
code = code.replace(/scheduleDataSource,\n?\s*/g, '');
code = code.replace(/handleScheduleDataSourceChange,\n?\s*/g, '');

fs.writeFileSync(file, code);

// Clean useCapPhepDialog
file = 'D:\\Quanlybenxebacninh\\client\\src\\hooks\\useCapPhepDialog.ts';
code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{\n\s*fetchSchedulesFromAppsheetTbJoin,\n\s*type TbJoinScheduleDiagnostics,\n\} from "@\/services\/appsheet-fetch-schedules-tb-join";\n?/g, '');
code = code.replace(/import \{ fetchXeCapacitiesFromAppsheetByPlate \} from "@\/services\/appsheet-seat-from-xe";\n?/g, '');
code = code.replace(/,\n\s*type ScheduleDataSource/g, '');
code = code.replace(/,\n\s*type ScheduleAppSheetFetchStepRow/g, '');
code = code.replace(/,\n\s*type AppSheetScheduleProgressEvent/g, '');

code = code.replace(/const \[isUsingAppsheetSchedules, setIsUsingAppsheetSchedules\] = useState\(false\);\n?\s*/g, '');
code = code.replace(/const \[scheduleDataSource, setScheduleDataSource\] = useState<ScheduleDataSource>\("database"\);\n?\s*/g, '');
code = code.replace(/const \[isLoadingTbJoinSchedules, setIsLoadingTbJoinSchedules\] = useState\(false\);\n?\s*/g, '');
code = code.replace(/const \[scheduleFetchSteps, setScheduleFetchSteps\] = useState<ScheduleAppSheetFetchStepRow\[\]>\(\[\]\);\n?\s*/g, '');
code = code.replace(/const \[scheduleTbDiagnostics, setScheduleTbDiagnostics\] = useState<TbJoinScheduleDiagnostics \| null>\(\n\s*null,\n\s*\);\n?\s*/g, '');
code = code.replace(/const \[isLoadingAppsheetSchedules, setIsLoadingAppsheetSchedules\] = useState\(false\);\n?\s*/g, '');

let progressStart = code.indexOf('const reportAppsheetScheduleProgress');
let progressEnd = code.indexOf('  const { currentShift }');
code = code.substring(0, progressStart) + code.substring(progressEnd);

code = code.replace(/Record<string, \{ items: Schedule\[\]; source: "database" \| "appsheet" \}>/g, 'Record<string, { items: Schedule[] }>');
code = code.replace(/const scheduleCacheKey = [^;]+;\n/g, '');

loadSchedulesStart = code.indexOf('const loadSchedules = useCallback(');
loadSchedulesEnd = code.indexOf('  /**\n   * AppSheet: Ref_Tuyen');

newLoadSchedules = `const loadSchedules = useCallback(
    async (rid: string, opId?: string) => {
      try {
        const cacheKey = \`\${opId ? \`\${rid}_\${opId}\` : rid}\`;
        const cached = schedulesCacheRef.current[cacheKey];
        if (cached) {
          setSchedules(cached.items);
          return;
        }

        const dbData = await scheduleService.getAll(rid, opId, true, "Đi");
        const list = Array.isArray(dbData) ? dbData : [];
        setSchedules(list);
        schedulesCacheRef.current[cacheKey] = { items: list };
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    },
    [routes, operators],
  );\n\n`;

code = code.substring(0, loadSchedulesStart) + newLoadSchedules + code.substring(loadSchedulesEnd);

let tbJoinStart = code.indexOf('  /**\n   * AppSheet: Ref_Tuyen');
let tbJoinEnd = code.indexOf('  const calculateTotal = useCallback(');
code = code.substring(0, tbJoinStart) + code.substring(tbJoinEnd);

let seatEffectStart = code.indexOf('  /** Lấy ghế từ RTDB và AppSheet');
let seatEffectEnd = code.indexOf('  // Auto-fill routeId:');
code = code.substring(0, seatEffectStart) + code.substring(seatEffectEnd);

code = code.replace(/if \(isUsingAppsheetSchedules\) \{[\s\S]*?return;\n\s*\}/g, '');
code = code.replace(/isUsingAppsheetSchedules,\n?\s*/g, '');

code = code.replace(/scheduleDataSource,\n?\s*/g, '');
code = code.replace(/handleScheduleDataSourceChange,\n?\s*/g, '');
code = code.replace(/loadSchedulesFromAppsheetTbJoin,\n?\s*/g, '');
code = code.replace(/isLoadingTbJoinSchedules,\n?\s*/g, '');
code = code.replace(/isLoadingAppsheetSchedules,\n?\s*/g, '');
code = code.replace(/scheduleFetchSteps,\n?\s*/g, '');
code = code.replace(/scheduleTbDiagnostics,\n?\s*/g, '');

// Also remove `upsertScheduleProgressRow` from imports
code = code.replace(/upsertScheduleProgressRow,\n?\s*/g, '');

// And unused imports
code = code.replace(/import \{ scheduleApi \} from "@\/features\/fleet\/schedules";\n?/g, '');

fs.writeFileSync(file, code);
