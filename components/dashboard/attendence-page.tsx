'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { AttendanceStatus } from '@prisma/client'
import { getAttendanceList, saveDailyAttendance, getTeacherAttendance, saveTeacherAttendance } from '@/app/actions/attendance'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Users, UserX, Clock, CalendarOff } from 'lucide-react'

// Added 'summary' to the type definition
type StudentRow = {
    studentId: string;
    name: string;
    rollNo: string | null;
    status: AttendanceStatus;
    summary: { present: number; absent: number; late: number; excused: number; }
}
type TeacherRow = { teacherId: string; displayId: string; name: string; status: AttendanceStatus }

export default function AttendancePageClient({
    classes, subjects, schoolId
}: {
    classes: { id: string; name: string; section: string }[];
    subjects: { id: string; name: string; code: string }[];
    schoolId: string;
}) {
    // NEW: Split single date into fromDate and toDate
    const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0])

    const [isPending, startTransition] = useTransition()
    const [isSaving, setIsSaving] = useState(false)

    const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined)
    const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined)
    const [studentRecords, setStudentRecords] = useState<StudentRow[]>([])
    const [teacherRecords, setTeacherRecords] = useState<TeacherRow[]>([])

    const isSingleDay = fromDate === toDate;

    // Fetch Students (Updated to use fromDate and toDate)
    useEffect(() => {
        if (!selectedClass || !fromDate || !toDate) return
        startTransition(async () => {
            const subjectFilter = selectedSubject === 'all' ? undefined : selectedSubject
            const result = await getAttendanceList(selectedClass, fromDate, toDate, subjectFilter)
            if (result.success && result.data) setStudentRecords(result.data as StudentRow[])
            else toast.error(result.error)
        })
    }, [selectedClass, selectedSubject, fromDate, toDate])

    // Fetch Teachers (Using fromDate for simplicity on staff tab)
    useEffect(() => {
        if (!fromDate || !schoolId) return
        startTransition(async () => {
            const result = await getTeacherAttendance(schoolId, fromDate)
            if (result.success && result.data) setTeacherRecords(result.data as TeacherRow[])
            else toast.error(result.error)
        })
    }, [fromDate, schoolId])

    const updateStudentStatus = (id: string, status: AttendanceStatus) => {
        setStudentRecords(prev => prev.map(r => r.studentId === id ? { ...r, status } : r))
    }

    const updateTeacherStatus = (id: string, status: AttendanceStatus) => {
        setTeacherRecords(prev => prev.map(r => r.teacherId === id ? { ...r, status } : r))
    }

    const handleSaveStudents = async () => {
        if (!selectedClass || studentRecords.length === 0 || !isSingleDay) return
        setIsSaving(true)
        const subjectFilter = selectedSubject === 'all' ? undefined : selectedSubject
        const result = await saveDailyAttendance(
            selectedClass, fromDate,
            studentRecords.map(r => ({ studentId: r.studentId, status: r.status })),
            subjectFilter
        )
        setIsSaving(false)
        if (result.success) toast.success('Student attendance saved')
        else toast.error(result.error)
    }

    const handleSaveTeachers = async () => {
        if (teacherRecords.length === 0) return
        setIsSaving(true)
        const result = await saveTeacherAttendance(
            schoolId, fromDate,
            teacherRecords.map(r => ({ teacherId: r.teacherId, status: r.status }))
        )
        setIsSaving(false)
        if (result.success) toast.success('Teacher attendance saved')
        else toast.error(result.error)
    }

    const getMetrics = (records: { status: AttendanceStatus }[]) => ({
        present: records.filter(r => r.status === 'PRESENT').length,
        absent: records.filter(r => r.status === 'ABSENT').length,
        late: records.filter(r => r.status === 'LATE').length,
        excused: records.filter(r => r.status === 'EXCUSED').length,
    })

    const studentMetrics = useMemo(() => getMetrics(studentRecords), [studentRecords])
    const teacherMetrics = useMemo(() => getMetrics(teacherRecords), [teacherRecords])

    const MetricCards = ({ metrics }: { metrics: ReturnType<typeof getMetrics> }) => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-emerald-50/50 border-emerald-100"><CardContent className="p-4 flex items-center gap-4"><Users className="w-8 h-8 text-emerald-600" /><div className="flex flex-col"><span className="text-sm font-medium text-emerald-600">Present</span><span className="text-2xl font-bold text-emerald-900">{metrics.present}</span></div></CardContent></Card>
            <Card className="bg-rose-50/50 border-rose-100"><CardContent className="p-4 flex items-center gap-4"><UserX className="w-8 h-8 text-rose-600" /><div className="flex flex-col"><span className="text-sm font-medium text-rose-600">Absent</span><span className="text-2xl font-bold text-rose-900">{metrics.absent}</span></div></CardContent></Card>
            <Card className="bg-amber-50/50 border-amber-100"><CardContent className="p-4 flex items-center gap-4"><Clock className="w-8 h-8 text-amber-600" /><div className="flex flex-col"><span className="text-sm font-medium text-amber-600">Late</span><span className="text-2xl font-bold text-amber-900">{metrics.late}</span></div></CardContent></Card>
            <Card className="bg-blue-50/50 border-blue-100"><CardContent className="p-4 flex items-center gap-4"><CalendarOff className="w-8 h-8 text-blue-600" /><div className="flex flex-col"><span className="text-sm font-medium text-blue-600">Excused / Holiday</span><span className="text-2xl font-bold text-blue-900">{metrics.excused}</span></div></CardContent></Card>
        </div>
    )

    const StatusSelect = ({ value, onChange }: { value: AttendanceStatus, onChange: (val: AttendanceStatus) => void }) => {
        const colorMap = { PRESENT: 'bg-emerald-100 text-emerald-800', ABSENT: 'bg-rose-100 text-rose-800', LATE: 'bg-amber-100 text-amber-800', EXCUSED: 'bg-blue-100 text-blue-800' }
        return (
            <Select value={value} onValueChange={(val) => val && onChange(val as AttendanceStatus)}>
                <SelectTrigger className={`w-[140px] h-9 font-medium border-0 ${colorMap[value]}`}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="EXCUSED">Excused/Holiday</SelectItem>
                </SelectContent>
            </Select>
        )
    }

    // Helper to force correct text rendering in the Select box
    const getSelectedClassText = () => {
        if (!selectedClass) return "Select class..."
        const cls = classes.find(c => c.id === selectedClass)
        return cls ? `${cls.name} - Section ${cls.section}` : "Select class..."
    }

    const getSelectedSubjectText = () => {
        if (selectedSubject === 'all' || !selectedSubject) return "Overall Daily Attendance"
        const sub = subjects.find(s => s.id === selectedSubject)
        return sub ? `${sub.name} (${sub.code})` : "Overall Daily Attendance"
    }

    return (
        <Tabs defaultValue="students" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <TabsList className="h-11 w-full md:w-auto grid grid-cols-2">
                    <TabsTrigger value="students" className="text-base">Student Attendance</TabsTrigger>
                    <TabsTrigger value="teachers" className="text-base">Staff Attendance</TabsTrigger>
                </TabsList>

                {/* NEW: Date Range Inputs */}
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-md border shadow-sm w-full md:w-auto overflow-hidden">
                    <span className="text-sm font-medium pl-2 text-muted-foreground">From:</span>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 border-0 shadow-none focus-visible:ring-0 w-auto" />
                    <div className="w-px h-6 bg-slate-200" />
                    <span className="text-sm font-medium text-muted-foreground">To:</span>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 border-0 shadow-none focus-visible:ring-0 w-auto" />
                </div>
            </div>

            <TabsContent value="students" className="space-y-4 outline-none">
                {selectedClass && isSingleDay && <MetricCards metrics={studentMetrics} />}

                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                        <div className="w-full md:w-64 space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Class & Section</label>
                            <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val ?? undefined)}>
                                <SelectTrigger className="w-full">
                                    {/* FIX: Manually enforce the correct label display to prevent raw IDs */}
                                    <SelectValue>{getSelectedClassText()}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.length === 0 ? (
                                        <SelectItem value="empty" disabled>No classes found in DB</SelectItem>
                                    ) : (
                                        classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - Section {c.section}</SelectItem>)
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full md:w-64 space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Subject (Optional)</label>
                            <Select value={selectedSubject || 'all'} onValueChange={(val) => setSelectedSubject(val ?? undefined)}>
                                <SelectTrigger className="w-full">
                                    {/* FIX: Manually enforce the correct label display */}
                                    <SelectValue>{getSelectedSubjectText()}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Overall Daily Attendance</SelectItem>
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Save Button changes text/disabled state based on date range */}
                        <Button
                            className="ml-auto w-full md:w-auto"
                            onClick={handleSaveStudents}
                            disabled={isSaving || isPending || !selectedClass || studentRecords.length === 0 || !isSingleDay}
                        >
                            {isSingleDay ? (isSaving ? 'Saving...' : 'Save Student') : 'Cannot Save Range'}
                        </Button>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[100px] font-semibold text-gray-900">Roll No</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Student Name</TableHead>
                                    <TableHead className="w-[250px] font-semibold text-gray-900 text-right pr-6">
                                        {isSingleDay ? 'Status' : 'Attendance Summary'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isPending ? (
                                    <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">Syncing ...</TableCell></TableRow>
                                ) : studentRecords.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">Select a class to view records.</TableCell></TableRow>
                                ) : (
                                    studentRecords.map((record) => (
                                        <TableRow key={record.studentId} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="font-medium text-gray-600">{record.rollNo || '-'}</TableCell>
                                            <TableCell className="font-medium text-gray-900">{record.name}</TableCell>
                                            <TableCell className="text-right">
                                                {isSingleDay ? (
                                                    <div className="flex justify-end"><StatusSelect value={record.status} onChange={(val) => updateStudentStatus(record.studentId, val)} /></div>
                                                ) : (
                                                    // If viewing a date range, show aggregated badges instead of an editable dropdown
                                                    <div className="flex justify-end gap-2 text-xs">
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">P: {record.summary.present}</Badge>
                                                        <Badge variant="outline" className="bg-rose-50 text-rose-700">A: {record.summary.absent}</Badge>
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700">L: {record.summary.late}</Badge>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="teachers" className="space-y-4 outline-none">
                <MetricCards metrics={teacherMetrics} />
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Staff</h3>
                            <p className="text-sm text-muted-foreground">Log daily arrival times and holiday leaves.</p>
                        </div>
                        <Button onClick={handleSaveTeachers} disabled={isSaving || isPending || teacherRecords.length === 0}>
                            {isSaving ? 'Saving...' : 'Save Staff'}
                        </Button>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[150px] font-semibold text-gray-900">Staff ID</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Teacher Name</TableHead>
                                    <TableHead className="w-[200px] font-semibold text-gray-900 text-right pr-6">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isPending ? (
                                    <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">Syncing staff ...</TableCell></TableRow>
                                ) : teacherRecords.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">No teachers registered in the system.</TableCell></TableRow>
                                ) : (
                                    teacherRecords.map((record) => (
                                        <TableRow key={record.teacherId} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell><Badge variant="outline" className="font-mono">{record.displayId}</Badge></TableCell>
                                            <TableCell className="font-medium text-gray-900">{record.name}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end"><StatusSelect value={record.status} onChange={(val) => updateTeacherStatus(record.teacherId, val)} /></div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    )
}