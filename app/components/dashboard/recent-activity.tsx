
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { DollarSign, MessageSquare, UserPlus, FileText } from 'lucide-react'
import { RecentActivity } from '../../lib/types'

interface RecentActivityProps {
  activities: RecentActivity[]
}

export function RecentActivityCard({ activities }: RecentActivityProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4" />
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      case 'parent':
        return <UserPlus className="h-4 w-4" />
      case 'contract':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getVariant = (type: string) => {
    switch (type) {
      case 'payment':
        return 'default'
      case 'message':
        return 'secondary'
      case 'parent':
        return 'outline'
      case 'contract':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.length > 0 ? (
            activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Badge variant={getVariant(activity.type)} className="p-2">
                    {getIcon(activity.type)}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.description}
                  </p>
                  {activity.parentName && (
                    <p className="text-sm text-muted-foreground">
                      {activity.parentName}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-sm text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
