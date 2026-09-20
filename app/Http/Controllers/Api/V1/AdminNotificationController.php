<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class AdminNotificationController extends Controller
{
    public function index(Request $request, AdminNotificationService $service): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        $service->sync($admin);

        $filter = $request->string('filter', 'all')->lower()->toString();
        $search = trim($request->string('search')->toString());
        $query = $admin->notifications()->whereNull('data->deleted_at');

        if ($filter === 'unread') $query->whereNull('read_at');
        if ($filter === 'read') $query->whereNotNull('read_at');
        if ($search !== '') {
            $query->where(fn ($builder) => $builder
                ->where('data->title', 'like', "%{$search}%")
                ->orWhere('data->message', 'like', "%{$search}%")
                ->orWhere('data->related_user', 'like', "%{$search}%")
                ->orWhere('data->type', 'like', "%{$search}%"));
        }

        $notifications = $query->latest()->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $notifications->getCollection()->map(fn (DatabaseNotification $notification) => $this->format($notification))->values(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread' => $admin->notifications()->whereNull('data->deleted_at')->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $notificationId): JsonResponse
    {
        $notification = $this->find($request, $notificationId);
        $notification->markAsRead();

        return response()->json(['success' => true, 'data' => $this->format($notification->fresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->whereNull('data->deleted_at')->update(['read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }

    public function destroy(Request $request, string $notificationId): JsonResponse
    {
        $notification = $this->find($request, $notificationId);
        $data = $notification->data;
        $data['deleted_at'] = now()->toISOString();
        $notification->forceFill(['data' => $data])->save();

        return response()->json(['success' => true, 'message' => 'Notification deleted.']);
    }

    private function find(Request $request, string $notificationId): DatabaseNotification
    {
        return $request->user()->notifications()->whereKey($notificationId)->firstOrFail();
    }

    private function format(DatabaseNotification $notification): array
    {
        $data = $notification->data;

        return [
            'id' => $notification->id,
            'title' => $data['title'] ?? 'System notification',
            'message' => $data['message'] ?? '',
            'type' => $data['type'] ?? 'system',
            'relatedUser' => $data['related_user'] ?? 'System',
            'relatedType' => $data['related_type'] ?? null,
            'relatedId' => $data['related_id'] ?? null,
            'relatedTab' => $data['related_tab'] ?? null,
            'isRead' => $notification->read_at !== null,
            'readAt' => $notification->read_at?->toISOString(),
            'createdAt' => $notification->created_at?->toISOString(),
        ];
    }
}
