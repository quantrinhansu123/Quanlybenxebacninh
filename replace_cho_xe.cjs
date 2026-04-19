const fs = require('fs');

function processChoXeVaoBen() {
  const file = 'D:\\Quanlybenxebacninh\\client\\src\\hooks\\useChoXeVaoBenForm.ts';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Remove imports
  code = code.replace(/import \{ fetchSchedulesFromAppsheetTbJoin \} from "@\/services\/appsheet-fetch-schedules-tb-join";\n?/g, '');
  code = code.replace(/,\n\s*ScheduleDataSource/g, '');
  code = code.replace(/ScheduleDataSource,/g, '');

  // 2. Remove states related to appsheet
  code = code.replace(/const \[isLoadingTbJoinSchedules, setIsLoadingTbJoinSchedules\] = useState\(false\);\n?/g, '');
  code = code.replace(/const scheduleDataSource = useDispatchStore\(\(s\) => s\.scheduleDataSource\);\n?/g, '');
  code = code.replace(/const setScheduleDataSource = useDispatchStore\(\(s\) => s\.setScheduleDataSource\);\n?/g, '');

  // Fix up the cache ref type
  code = code.replace(/Record<string, \{ items: Schedule\[\]; source: ScheduleDataSource }>/g, 'Record<string, { items: Schedule[] }>');
  code = code.replace(/Record<string, \{ items: Schedule\[\]; source: "database" }>/g, 'Record<string, { items: Schedule[] }>');

  // Remove scheduleCacheKey
  code = code.replace(/const scheduleCacheKey = [^;]+;\n/g, '');

  // 3. Update loadSchedules
  const loadSchedulesStart = code.indexOf('const loadSchedules = useCallback(');
  const loadSchedulesEnd = code.indexOf('  useEffect(() => {\n    if (routeId)');
  
  const newLoadSchedules = `const loadSchedules = useCallback(
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
    [vehicleOperatorId],
  );\n\n`;

  code = code.substring(0, loadSchedulesStart) + newLoadSchedules + code.substring(loadSchedulesEnd);

  // 4. Remove handleScheduleDataSourceChange & loadSchedulesFromAppsheetTbJoin
  const appsheetFuncsStart = code.indexOf('  const handleScheduleDataSourceChange');
  const appsheetFuncsEnd = code.indexOf('  const handleVehicleSelect');
  if (appsheetFuncsStart !== -1 && appsheetFuncsEnd !== -1) {
    code = code.substring(0, appsheetFuncsStart) + code.substring(appsheetFuncsEnd);
  }

  // 5. Remove reset form appsheet states
  code = code.replace(/setScheduleDataSource\("database"\);\n?\s*/g, '');

  // 6. Return values
  code = code.replace(/loadSchedulesFromAppsheetTbJoin,\n?\s*/g, '');
  code = code.replace(/isLoadingTbJoinSchedules,\n?\s*/g, '');
  code = code.replace(/scheduleDataSource,\n?\s*/g, '');
  code = code.replace(/handleScheduleDataSourceChange,\n?\s*/g, '');

  fs.writeFileSync(file, code);
}
processChoXeVaoBen();
