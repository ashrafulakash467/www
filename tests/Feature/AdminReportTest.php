<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\AdminReportController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AdminReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_admin_report_can_be_built_from_the_database(): void
    {
        $controller = app(AdminReportController::class);
        $reports = ['appointments', 'doctors', 'patients', 'payments', 'refunds', 'earnings', 'medical-records', 'audit', 'support', 'date-summary'];

        foreach ($reports as $report) {
            $response = $controller->show(Request::create('/', 'GET', ['period' => 'monthly']), $report);
            $payload = $response->getData(true);

            $this->assertTrue($payload['success'], $report);
            $this->assertArrayHasKey('stats', $payload, $report);
            $this->assertArrayHasKey('rows', $payload, $report);
            $this->assertArrayHasKey('meta', $payload, $report);
        }
    }
}
