<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/** Demonstrate a unit test that runs without booting the Laravel application. */
class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_that_true_is_true(): void
    {
        // A unit assertion compares an actual value with the expected behavior directly.
        $this->assertTrue(true);
    }
}
