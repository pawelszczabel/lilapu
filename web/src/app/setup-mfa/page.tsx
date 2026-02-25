import { TaskSetupMFA } from '@clerk/nextjs'

export default function SetupMFAPage() {
    return <TaskSetupMFA redirectUrlComplete="/dashboard" />
}
