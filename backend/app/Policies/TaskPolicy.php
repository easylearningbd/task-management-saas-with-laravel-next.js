<?php

namespace App\Policies;

/** A company works only with its own Task records (CompanyOwnedPolicy). */
class TaskPolicy extends CompanyOwnedPolicy {}
